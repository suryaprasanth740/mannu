import { Router } from 'express';
import mongoose from 'mongoose';
import { Category, FarmerProfile, Product, Review, User, getSettings } from '../models/index.js';
import { ah, escapeRegex, notFound, paginate } from '../utils/http.js';
import { sellableFarmerIds } from '../utils/pricing.js';

const router = Router();

/** Attach a public farmer summary to each product. */
export async function withFarmers(products) {
  const ids = [...new Set(products.map((p) => String(p.farmer)))];
  const [profiles, users] = await Promise.all([
    FarmerProfile.find({ user: { $in: ids } }).lean(),
    User.find({ _id: { $in: ids } }).select('name').lean(),
  ]);
  const prof = new Map(profiles.map((p) => [String(p.user), p]));
  const usr = new Map(users.map((u) => [String(u._id), u]));
  return products.map((p) => {
    const fp = prof.get(String(p.farmer));
    return {
      ...p,
      farmer: {
        id: String(p.farmer),
        name: usr.get(String(p.farmer))?.name,
        farmName: fp?.farmName,
        location: fp?.location,
        photo: fp?.photo?.url || '',
        coverPhoto: fp?.coverPhoto?.url || '',
        verified: fp?.verification?.status === 'approved',
      },
    };
  });
}

router.get(
  '/categories',
  ah(async (_req, res) => {
    const categories = await Category.find({ isActive: true }).sort({ sortOrder: 1, name: 1 }).lean();
    const sellable = await sellableFarmerIds();
    const counts = await Product.aggregate([
      { $match: { isActive: true, isBlocked: false, farmer: { $in: sellable } } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]);
    const countBy = new Map(counts.map((c) => [String(c._id), c.count]));
    res.json({ categories: categories.map((c) => ({ ...c, productCount: countBy.get(String(c._id)) || 0 })) });
  })
);

router.get(
  '/settings/public',
  ah(async (_req, res) => res.json({ settings: await getSettings() }))
);

router.get(
  '/districts',
  ah(async (_req, res) => {
    const profiles = await FarmerProfile.find({ 'verification.status': 'approved' }).select('location').lean();
    const districts = [...new Set(profiles.map((p) => p.location?.district).filter(Boolean))].sort();
    res.json({ districts });
  })
);

router.get(
  '/products',
  ah(async (req, res) => {
    const q = req.query;
    const farmerFilter = {};
    if (q.district) farmerFilter['location.district'] = String(q.district);
    let farmerIds = await sellableFarmerIds(farmerFilter);
    if (q.farmer && mongoose.isValidObjectId(q.farmer)) {
      farmerIds = farmerIds.filter((id) => String(id) === String(q.farmer));
    }

    const filter = { isActive: true, isBlocked: false, farmer: { $in: farmerIds } };
    if (q.category) {
      const cat = await Category.findOne({ slug: String(q.category) }).select('_id').lean();
      filter.category = cat ? cat._id : null;
    }
    if (q.q) {
      const rx = new RegExp(escapeRegex(String(q.q).trim().slice(0, 60)), 'i');
      filter.$or = [{ name: rx }, { description: rx }, { 'localNames.kn': rx }, { 'localNames.ta': rx }, { 'localNames.te': rx }];
    }
    const minPrice = Number(q.minPrice);
    const maxPrice = Number(q.maxPrice);
    if (q.minPrice && Number.isFinite(minPrice)) filter.price = { ...filter.price, $gte: minPrice };
    if (q.maxPrice && Number.isFinite(maxPrice)) filter.price = { ...filter.price, $lte: maxPrice };
    if (q.organic === 'true') filter.isOrganic = true;
    if (q.inSeason === 'true') {
      filter.seasonal = true;
      filter.seasonMonths = new Date().getMonth() + 1;
    }
    if (q.seasonal === 'true') filter.seasonal = true;
    if (q.ids) {
      const ids = String(q.ids).split(',').filter((id) => mongoose.isValidObjectId(id)).slice(0, 60);
      filter._id = { $in: ids };
    }
    if (q.bulk === 'true') filter['bulkTiers.0'] = { $exists: true };
    if (q.inStock !== 'false') filter.stock = { $gt: 0 };

    const sorts = {
      new: { createdAt: -1 },
      price_asc: { price: 1 },
      price_desc: { price: -1 },
      rating: { ratingAvg: -1, ratingCount: -1 },
      popular: { soldQty: -1, ratingCount: -1 },
    };
    const sort = sorts[q.sort] || sorts.popular;
    const { page, limit, skip } = paginate(q);

    const [items, total] = await Promise.all([
      Product.find(filter).sort({ ...sort, _id: 1 }).skip(skip).limit(limit).populate('category', 'name slug icon localNames').lean(),
      Product.countDocuments(filter),
    ]);
    res.json({ products: await withFarmers(items), total, page, pages: Math.ceil(total / limit) });
  })
);

router.get(
  '/products/:id',
  ah(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) throw notFound('Product not found');
    const product = await Product.findById(req.params.id).populate('category', 'name slug icon localNames').lean();
    if (!product || product.isBlocked) throw notFound('Product not found');
    const sellable = (await sellableFarmerIds()).map(String);
    const visible = product.isActive && sellable.includes(String(product.farmer));
    if (!visible) throw notFound('This product is not available right now');

    const [[withFarmer], profile, reviews, more] = await Promise.all([
      withFarmers([product]),
      FarmerProfile.findOne({ user: product.farmer }).lean(),
      Review.find({ product: product._id }).sort({ createdAt: -1 }).limit(20).populate('customer', 'name').lean(),
      Product.find({ farmer: product.farmer, _id: { $ne: product._id }, isActive: true, isBlocked: false, stock: { $gt: 0 } })
        .limit(8)
        .lean(),
    ]);
    res.json({
      product: withFarmer,
      fulfillment: profile?.fulfillment,
      farmerBio: profile?.bio,
      farmingPractices: profile?.farmingPractices,
      reviews: reviews.map((r) => ({
        id: r._id,
        rating: r.rating,
        comment: r.comment,
        name: r.customer?.name?.split(' ')[0] || 'Customer',
        createdAt: r.createdAt,
      })),
      moreFromFarmer: more,
    });
  })
);

router.get(
  '/farmers',
  ah(async (req, res) => {
    const filter = { 'verification.status': 'approved' };
    if (req.query.district) filter['location.district'] = String(req.query.district);
    const ids = await sellableFarmerIds(req.query.district ? { 'location.district': String(req.query.district) } : {});
    const profiles = await FarmerProfile.find({ ...filter, user: { $in: ids } }).lean();
    const users = await User.find({ _id: { $in: ids } }).select('name').lean();
    const counts = await Product.aggregate([
      { $match: { farmer: { $in: ids }, isActive: true, isBlocked: false, stock: { $gt: 0 } } },
      { $group: { _id: '$farmer', count: { $sum: 1 } } },
    ]);
    const countBy = new Map(counts.map((c) => [String(c._id), c.count]));
    const nameBy = new Map(users.map((u) => [String(u._id), u.name]));
    const farmers = profiles
      .map((p) => ({
        id: String(p.user),
        name: nameBy.get(String(p.user)),
        farmName: p.farmName,
        bio: p.bio,
        location: p.location,
        photo: p.photo?.url || '',
        coverPhoto: p.coverPhoto?.url || '',
        farmingPractices: p.farmingPractices,
        productCount: countBy.get(String(p.user)) || 0,
        offersDelivery: p.fulfillment?.offersDelivery,
        offersPickup: p.fulfillment?.offersPickup,
      }))
      .sort((a, b) => b.productCount - a.productCount);
    res.json({ farmers });
  })
);

router.get(
  '/farmers/:id',
  ah(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) throw notFound('Farmer not found');
    const ids = (await sellableFarmerIds()).map(String);
    if (!ids.includes(req.params.id)) throw notFound('Farmer not found');
    const [profile, user, products] = await Promise.all([
      FarmerProfile.findOne({ user: req.params.id }).lean(),
      User.findById(req.params.id).select('name createdAt').lean(),
      Product.find({ farmer: req.params.id, isActive: true, isBlocked: false })
        .sort({ stock: -1, soldQty: -1 })
        .populate('category', 'name slug icon localNames')
        .lean(),
    ]);
    const rated = products.filter((p) => p.ratingCount > 0);
    const ratingCount = rated.reduce((s, p) => s + p.ratingCount, 0);
    const ratingAvg = ratingCount ? rated.reduce((s, p) => s + p.ratingAvg * p.ratingCount, 0) / ratingCount : 0;
    res.json({
      farmer: {
        id: req.params.id,
        name: user?.name,
        memberSince: user?.createdAt,
        farmName: profile.farmName,
        bio: profile.bio,
        farmingPractices: profile.farmingPractices,
        location: profile.location,
        photo: profile.photo?.url || '',
        coverPhoto: profile.coverPhoto?.url || '',
        fulfillment: profile.fulfillment,
        ratingAvg: Math.round(ratingAvg * 10) / 10,
        ratingCount,
      },
      products: await withFarmers(products),
    });
  })
);

export default router;
