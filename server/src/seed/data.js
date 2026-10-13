// Realistic demo data for South India. All people and farms are fictional.

export const DEMO_PASSWORD = 'Mannu@2026';

export const categories = [
  { name: 'Vegetables', icon: '🥕', localNames: { kn: 'ತರಕಾರಿಗಳು', ta: 'காய்கறிகள்', te: 'కూరగాయలు' } },
  { name: 'Leafy greens', icon: '🥬', localNames: { kn: 'ಸೊಪ್ಪು', ta: 'கீரைகள்', te: 'ఆకుకూరలు' } },
  { name: 'Fruits', icon: '🍌', localNames: { kn: 'ಹಣ್ಣುಗಳು', ta: 'பழங்கள்', te: 'పండ్లు' } },
  { name: 'Rice & millets', icon: '🌾', localNames: { kn: 'ಅಕ್ಕಿ ಮತ್ತು ಸಿರಿಧಾನ್ಯ', ta: 'அரிசி & சிறுதானியம்', te: 'బియ్యం & చిరుధాన్యాలు' } },
  { name: 'Pulses', icon: '🫘', localNames: { kn: 'ಬೇಳೆ ಕಾಳುಗಳು', ta: 'பருப்பு வகைகள்', te: 'పప్పు ధాన్యాలు' } },
  { name: 'Spices', icon: '🌶️', localNames: { kn: 'ಮಸಾಲೆಗಳು', ta: 'மசாலா பொருட்கள்', te: 'సుగంధ ద్రవ్యాలు' } },
  { name: 'Cold-pressed oils', icon: '🫙', localNames: { kn: 'ಗಾಣದ ಎಣ್ಣೆ', ta: 'செக்கு எண்ணெய்', te: 'గానుగ నూనె' } },
  { name: 'Honey & jaggery', icon: '🍯', localNames: { kn: 'ಜೇನು ಮತ್ತು ಬೆಲ್ಲ', ta: 'தேன் & வெல்லம்', te: 'తేనె & బెల్లం' } },
  { name: 'Milk & dairy', icon: '🥛', localNames: { kn: 'ಹಾಲು ಉತ್ಪನ್ನಗಳು', ta: 'பால் பொருட்கள்', te: 'పాల ఉత్పత్తులు' } },
].map((c, i) => ({ ...c, slug: c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), sortOrder: i }));

export const farmers = [
  {
    key: 'lakshmi',
    name: 'Lakshmamma N',
    email: 'lakshmi@mannu.in',
    phone: '9845012345',
    language: 'kn',
    profile: {
      farmName: 'Lakshmi Tota',
      bio: 'Three acres of vegetables and greens on the edge of Hoskote, farmed by our family for two generations. We pick in the evening and pack at dawn.',
      farmingPractices: 'Low-chemical · drip irrigation · cow-dung compost',
      location: { village: 'Nandagudi', district: 'Bengaluru Rural', state: 'Karnataka', pincode: '562122' },
      fulfillment: { offersDelivery: true, deliveryFee: 30, freeDeliveryAbove: 400, deliveryArea: 'Whitefield, KR Puram, Hoskote, Marathahalli', offersPickup: true, pickupAddress: 'Lakshmi Tota, near Nandagudi bus stand, Hoskote taluk', prepHours: 12 },
    },
  },
  {
    key: 'ramesh',
    name: 'Ramesh Gowda',
    email: 'ramesh@mannu.in',
    phone: '9900123456',
    language: 'kn',
    profile: {
      farmName: 'Gowda Thota, Srinivaspur',
      bio: 'Mango, guava and custard apple orchard in Kolar — the mango belt of Karnataka. We let fruit ripen on the tree as long as we can.',
      farmingPractices: 'Tree-ripened · no carbide ripening',
      location: { village: 'Srinivaspur', district: 'Kolar', state: 'Karnataka', pincode: '563135' },
      fulfillment: { offersDelivery: true, deliveryFee: 60, freeDeliveryAbove: 800, deliveryArea: 'All of Bengaluru (twice a week)', offersPickup: true, pickupAddress: 'Gowda Thota, Srinivaspur–Chintamani road, Kolar', prepHours: 36 },
    },
  },
  {
    key: 'murugan',
    name: 'Murugan K',
    email: 'murugan@mannu.in',
    phone: '9443012345',
    language: 'ta',
    profile: {
      farmName: 'Cauvery Delta Paddy',
      bio: 'Paddy and pulses from the Cauvery delta near Thiruvaiyaru. We grow traditional rice varieties alongside Ponni and mill them in small batches.',
      farmingPractices: 'Traditional varieties · small-batch milling',
      location: { village: 'Thiruvaiyaru', district: 'Thanjavur', state: 'Tamil Nadu', pincode: '613204' },
      fulfillment: { offersDelivery: true, deliveryFee: 80, freeDeliveryAbove: 1500, deliveryArea: 'Courier to Chennai, Bengaluru, Coimbatore', offersPickup: false, pickupAddress: '', prepHours: 48 },
    },
  },
  {
    key: 'venkata',
    name: 'Venkata Reddy',
    email: 'venkata@mannu.in',
    phone: '9440123456',
    language: 'te',
    profile: {
      farmName: 'Reddy Millet & Groundnut Farm',
      bio: 'Dryland farm near Madanapalle growing millets, groundnut and tomatoes. Our groundnut oil is pressed in a wooden chekku on the farm.',
      farmingPractices: 'Rain-fed millets · wood-pressed oil',
      location: { village: 'Madanapalle', district: 'Annamayya', state: 'Andhra Pradesh', pincode: '517325' },
      fulfillment: { offersDelivery: true, deliveryFee: 70, freeDeliveryAbove: 1200, deliveryArea: 'Bengaluru, Tirupati, Chittoor', offersPickup: true, pickupAddress: 'Reddy farm gate, Madanapalle–Punganur road', prepHours: 24 },
    },
  },
  {
    key: 'savitha',
    name: 'Savitha Hegde',
    email: 'savitha@mannu.in',
    phone: '9480123456',
    language: 'kn',
    profile: {
      farmName: 'Malnad Spice Garden',
      bio: 'Areca, pepper and cardamom garden in the hills near Sirsi. Bees from our garden boxes make the honey; the rest is hand-picked and sun-dried.',
      farmingPractices: 'Shade-grown · sun-dried · organic certified',
      location: { village: 'Sirsi', district: 'Uttara Kannada', state: 'Karnataka', pincode: '581401' },
      fulfillment: { offersDelivery: true, deliveryFee: 50, freeDeliveryAbove: 1000, deliveryArea: 'Courier across Karnataka and Tamil Nadu', offersPickup: false, pickupAddress: '', prepHours: 48 },
    },
  },
  {
    key: 'anjali',
    name: 'Anjali Devi',
    email: 'anjali@mannu.in',
    phone: '9741234567',
    language: 'kn',
    pending: true,
    profile: {
      farmName: 'Kaveri Bella Mane',
      bio: 'Sugarcane farm in Mandya making chemical-free jaggery in our own alemane.',
      farmingPractices: 'Chemical-free jaggery',
      location: { village: 'Maddur', district: 'Mandya', state: 'Karnataka', pincode: '571428' },
      fulfillment: { offersDelivery: true, deliveryFee: 50, freeDeliveryAbove: 600, deliveryArea: 'Mysuru, Mandya, Bengaluru', offersPickup: true, pickupAddress: 'Alemane, Maddur–Malavalli road', prepHours: 24 },
    },
  },
];

const L = (kn, ta, te) => ({ kn, ta, te });
const daysAgo = (n) => new Date(Date.now() - n * 86400000);

// cat = category slug; farmer = farmer key
export const products = [
  // Lakshmi Tota — vegetables, greens, dairy
  { farmer: 'lakshmi', cat: 'vegetables', name: 'Tomato (Nati)', icon: '🍅', localNames: L('ನಾಟಿ ಟೊಮೆಟೊ', 'நாட்டு தக்காளி', 'నాటు టమాటా'), description: 'Country tomatoes — tangy, thin-skinned, best for rasam and chutney.', unit: 'kg', price: 32, stock: 120, minOrderQty: 1, bulkTiers: [{ minQty: 10, price: 27 }], harvestedOn: daysAgo(1) },
  { farmer: 'lakshmi', cat: 'vegetables', name: 'Brinjal (Purple)', icon: '🍆', localNames: L('ಬದನೆಕಾಯಿ', 'கத்தரிக்காய்', 'వంకాయ'), description: 'Small purple brinjal, picked tender. Ideal for ennegai and vangi bath.', unit: 'kg', price: 48, stock: 40, minOrderQty: 0.5, harvestedOn: daysAgo(1) },
  { farmer: 'lakshmi', cat: 'vegetables', name: 'Beans (French)', icon: '🫛', localNames: L('ಹುರುಳಿಕಾಯಿ', 'பீன்ஸ்', 'బీన్స్'), description: 'Stringless French beans, snapped crisp.', unit: 'kg', price: 64, stock: 35, minOrderQty: 0.5, harvestedOn: daysAgo(1) },
  { farmer: 'lakshmi', cat: 'vegetables', name: 'Green chilli', icon: '🌶️', localNames: L('ಹಸಿರು ಮೆಣಸಿನಕಾಯಿ', 'பச்சை மிளகாய்', 'పచ్చి మిరపకాయ'), description: 'Medium-hot local chillies.', unit: 'kg', price: 70, stock: 18, minOrderQty: 0.25, harvestedOn: daysAgo(2) },
  { farmer: 'lakshmi', cat: 'vegetables', name: 'Sweet potato', icon: '🍠', localNames: L('ಗೆಣಸು', 'சர்க்கரைவள்ளிக் கிழங்கு', 'చిలగడదుంప'), description: 'Freshly dug, pink-skinned sweet potato.', unit: 'kg', price: 45, stock: 60, minOrderQty: 1, seasonal: true, seasonMonths: [10, 11, 12, 1], harvestedOn: daysAgo(3) },
  { farmer: 'lakshmi', cat: 'vegetables', name: 'Avarekai (Field beans)', icon: '🫛', localNames: L('ಅವರೆಕಾಯಿ', 'மொச்சை', 'చిక్కుడు'), description: 'The winter favourite of Bengaluru — fragrant, plump field beans for avarekai saaru.', unit: 'kg', price: 90, stock: 50, minOrderQty: 1, seasonal: true, seasonMonths: [11, 12, 1, 2] },
  { farmer: 'lakshmi', cat: 'leafy-greens', name: 'Coriander', icon: '🌿', localNames: L('ಕೊತ್ತಂಬರಿ ಸೊಪ್ಪು', 'கொத்தமல்லி', 'కొత్తిమీర'), description: 'Big, fragrant bunches with roots on.', unit: 'bunch', price: 15, stock: 80, minOrderQty: 1, harvestedOn: daysAgo(0) },
  { farmer: 'lakshmi', cat: 'leafy-greens', name: 'Palak (Spinach)', icon: '🥬', localNames: L('ಪಾಲಕ್ ಸೊಪ್ಪು', 'பசலைக் கீரை', 'పాలకూర'), description: 'Tender spinach leaves, washed once at the farm.', unit: 'bunch', price: 20, stock: 60, minOrderQty: 1, harvestedOn: daysAgo(0) },
  { farmer: 'lakshmi', cat: 'leafy-greens', name: 'Dantu soppu (Amaranth)', icon: '🥬', localNames: L('ದಂಟಿನ ಸೊಪ್ಪು', 'தண்டுக்கீரை', 'తోటకూర'), description: 'Red-stemmed amaranth, great for palya and kootu.', unit: 'bunch', price: 18, stock: 45, minOrderQty: 1, harvestedOn: daysAgo(0) },
  { farmer: 'lakshmi', cat: 'leafy-greens', name: 'Curry leaves', icon: '🌿', localNames: L('ಕರಿಬೇವು', 'கறிவேப்பிலை', 'కరివేపాకు'), description: 'Glossy, strongly aromatic curry leaves.', unit: 'bunch', price: 10, stock: 100, minOrderQty: 1, harvestedOn: daysAgo(0) },
  { farmer: 'lakshmi', cat: 'milk-dairy', name: 'Cow milk (Nati)', icon: '🥛', localNames: L('ನಾಟಿ ಹಸುವಿನ ಹಾಲು', 'நாட்டு மாட்டுப் பால்', 'నాటు ఆవు పాలు'), description: 'Morning milk from our four Hallikar cows. Delivered in glass bottles.', unit: 'litre', price: 72, stock: 20, minOrderQty: 1 },
  { farmer: 'lakshmi', cat: 'milk-dairy', name: 'Thick curd (Mosaru)', icon: '🥣', localNames: L('ಮೊಸರು', 'தயிர்', 'పెరుగు'), description: 'Thick curd set overnight from our own cow milk. 500 g tub.', unit: 'unit', price: 65, stock: 12, minOrderQty: 1 },

  // Gowda Thota — fruits
  { farmer: 'ramesh', cat: 'fruits', name: 'Guava (Allahabad Safeda)', icon: '🍐', localNames: L('ಸೀಬೆಹಣ್ಣು', 'கொய்யாப்பழம்', 'జామపండు'), description: 'White-fleshed guava, sweet and crunchy, picked half-ripe.', unit: 'kg', price: 60, stock: 150, minOrderQty: 1, bulkTiers: [{ minQty: 5, price: 52 }], seasonal: true, seasonMonths: [8, 9, 10, 11, 12], harvestedOn: daysAgo(2), isOrganic: false },
  { farmer: 'ramesh', cat: 'fruits', name: 'Custard apple (Seethaphal)', icon: '🍈', localNames: L('ಸೀತಾಫಲ', 'சீத்தாப்பழம்', 'సీతాఫలం'), description: 'Creamy Balanagar custard apples. Ripen in 1–2 days at room temperature.', unit: 'kg', price: 95, stock: 80, minOrderQty: 1, bulkTiers: [{ minQty: 5, price: 85 }], seasonal: true, seasonMonths: [9, 10, 11], harvestedOn: daysAgo(2) },
  { farmer: 'ramesh', cat: 'fruits', name: 'Badami mango', icon: '🥭', localNames: L('ಬಾದಾಮಿ ಮಾವು', 'பாதாமி மாம்பழம்', 'బాదామి మామిడి'), description: 'Karnataka Alphonso, tree-ripened. Back in April.', unit: 'kg', price: 140, stock: 0, minOrderQty: 2, bulkTiers: [{ minQty: 10, price: 125 }], seasonal: true, seasonMonths: [4, 5, 6] },
  { farmer: 'ramesh', cat: 'fruits', name: 'Yelakki banana', icon: '🍌', localNames: L('ಏಲಕ್ಕಿ ಬಾಳೆಹಣ್ಣು', 'ஏலக்கி வாழைப்பழம்', 'ఏలక్కి అరటి'), description: 'Small, fragrant Yelakki bananas sold by the dozen.', unit: 'dozen', price: 70, stock: 60, minOrderQty: 1 },
  { farmer: 'ramesh', cat: 'vegetables', name: 'Tomato (Hybrid, crate)', icon: '🍅', localNames: L('ಟೊಮೆಟೊ', 'தக்காளி', 'టమాటా'), description: 'Firm hybrid tomatoes, good shelf life. Popular with small hotels — buy by the crate.', unit: 'kg', price: 26, stock: 600, minOrderQty: 5, bulkTiers: [{ minQty: 25, price: 22 }, { minQty: 100, price: 19 }] },

  // Cauvery Delta Paddy — rice, pulses
  { farmer: 'murugan', cat: 'rice-millets', name: 'Ponni boiled rice', icon: '🍚', localNames: L('ಪೊನ್ನಿ ಕುಸುಬಲಕ್ಕಿ', 'பொன்னி புழுங்கல் அரிசி', 'పొన్ని ఉప్పుడు బియ్యం'), description: 'Aged one year, everyday parboiled Ponni from this year\'s samba crop.', unit: 'kg', price: 64, stock: 900, minOrderQty: 5, bulkTiers: [{ minQty: 25, price: 58 }, { minQty: 100, price: 54 }] },
  { farmer: 'murugan', cat: 'rice-millets', name: 'Seeraga samba rice', icon: '🍚', localNames: L('ಜೀರಿಗೆ ಸಾಂಬಾ ಅಕ್ಕಿ', 'சீரக சம்பா அரிசி', 'జీలకర్ర సాంబా బియ్యం'), description: 'Tiny, fragrant grains for biryani and pongal.', unit: 'kg', price: 125, stock: 300, minOrderQty: 1, bulkTiers: [{ minQty: 10, price: 115 }] },
  { farmer: 'murugan', cat: 'rice-millets', name: 'Sona masuri rice', icon: '🍚', localNames: L('ಸೋನಾ ಮಸೂರಿ ಅಕ್ಕಿ', 'சோனா மசூரி அரிசி', 'సోనా మసూరి బియ్యం'), description: 'Light, low-starch raw rice for everyday meals. Single-polished.', unit: 'kg', price: 72, stock: 400, minOrderQty: 5, bulkTiers: [{ minQty: 25, price: 66 }], isOrganic: true },
  { farmer: 'murugan', cat: 'pulses', name: 'Urad dal (whole, black)', icon: '🫘', localNames: L('ಉದ್ದಿನ ಕಾಳು', 'முழு உளுந்து', 'మినుములు'), description: 'Whole black urad from the summer crop — for idli batter and dal makhani.', unit: 'kg', price: 140, stock: 200, minOrderQty: 1, bulkTiers: [{ minQty: 10, price: 128 }] },
  { farmer: 'murugan', cat: 'pulses', name: 'Green gram (Moong)', icon: '🫘', localNames: L('ಹೆಸರು ಕಾಳು', 'பச்சைப் பயறு', 'పెసలు'), description: 'Clean, sorted whole moong.', unit: 'kg', price: 125, stock: 150, minOrderQty: 1, bulkTiers: [{ minQty: 10, price: 115 }] },

  // Reddy farm — millets, oil, groundnut
  { farmer: 'venkata', cat: 'rice-millets', name: 'Ragi (Finger millet)', icon: '🌾', localNames: L('ರಾಗಿ', 'கேழ்வரகு', 'రాగులు'), description: 'Stone-cleaned ragi for mudde and malt.', unit: 'kg', price: 55, stock: 400, minOrderQty: 1, bulkTiers: [{ minQty: 25, price: 48 }], isOrganic: true },
  { farmer: 'venkata', cat: 'rice-millets', name: 'Foxtail millet (Navane)', icon: '🌾', localNames: L('ನವಣೆ', 'தினை', 'కొర్రలు'), description: 'Dehusked foxtail millet — cooks like rice.', unit: 'kg', price: 92, stock: 180, minOrderQty: 1, bulkTiers: [{ minQty: 10, price: 84 }], isOrganic: true },
  { farmer: 'venkata', cat: 'cold-pressed-oils', name: 'Groundnut oil (wood-pressed)', icon: '🫙', localNames: L('ಗಾಣದ ಕಡಲೆಕಾಯಿ ಎಣ್ಣೆ', 'கடலை எண்ணெய் (செக்கு)', 'గానుగ వేరుశెనగ నూనె'), description: 'Pressed in a wooden chekku at low speed, filtered by settling. No additives.', unit: 'litre', price: 290, stock: 140, minOrderQty: 1, bulkTiers: [{ minQty: 5, price: 270 }, { minQty: 15, price: 255 }] },
  { farmer: 'venkata', cat: 'vegetables', name: 'Fresh groundnut (in shell)', icon: '🥜', localNames: L('ಹಸಿ ಕಡಲೆಕಾಯಿ', 'பச்சை வேர்க்கடலை', 'పచ్చి వేరుశెనగ'), description: 'New-harvest groundnut — boil with salt.', unit: 'kg', price: 80, stock: 90, minOrderQty: 1, seasonal: true, seasonMonths: [9, 10, 11], harvestedOn: daysAgo(4) },
  { farmer: 'venkata', cat: 'pulses', name: 'Horse gram (Huruli)', icon: '🫘', localNames: L('ಹುರುಳಿ', 'கொள்ளு', 'ఉలవలు'), description: 'For huruli saaru and kollu rasam.', unit: 'kg', price: 95, stock: 110, minOrderQty: 1 },

  // Malnad Spice Garden — spices, honey
  { farmer: 'savitha', cat: 'spices', name: 'Black pepper (Malabar)', icon: '⚫', localNames: L('ಕಾಳುಮೆಣಸು', 'மிளகு', 'మిరియాలు'), description: 'Bold, sun-dried pepper berries from shade-grown vines.', unit: 'kg', price: 780, stock: 40, minOrderQty: 0.25, isOrganic: true },
  { farmer: 'savitha', cat: 'spices', name: 'Green cardamom', icon: '🟢', localNames: L('ಏಲಕ್ಕಿ', 'ஏலக்காய்', 'యాలకులు'), description: '7–8 mm green pods, dried on the estate.', unit: 'kg', price: 2600, stock: 12, minOrderQty: 0.25, isOrganic: true },
  { farmer: 'savitha', cat: 'spices', name: 'Turmeric powder', icon: '🟡', localNames: L('ಅರಿಶಿನ ಪುಡಿ', 'மஞ்சள் தூள்', 'పసుపు పొడి'), description: 'High-curcumin turmeric, boiled, dried and stone-ground.', unit: 'kg', price: 340, stock: 35, minOrderQty: 0.25, isOrganic: true },
  { farmer: 'savitha', cat: 'honey-jaggery', name: 'Forest honey (500 g jar)', icon: '🍯', localNames: L('ಕಾಡು ಜೇನು', 'காட்டுத் தேன்', 'అడవి తేనె'), description: 'Raw multi-flora honey from our garden bee boxes. Unheated — may crystallise in winter.', unit: 'unit', price: 360, stock: 30, minOrderQty: 1, bulkTiers: [{ minQty: 6, price: 330 }] },
  { farmer: 'savitha', cat: 'fruits', name: 'Tender coconut', icon: '🥥', localNames: L('ಎಳನೀರು', 'இளநீர்', 'కొబ్బరి బొండం'), description: 'Sweet-water tender coconuts.', unit: 'unit', price: 45, stock: 0, minOrderQty: 1 },

  // Kaveri Bella Mane (pending verification — hidden from the shop)
  { farmer: 'anjali', cat: 'honey-jaggery', name: 'Jaggery cubes (chemical-free)', icon: '🟫', localNames: L('ಬೆಲ್ಲ', 'வெல்லம்', 'బెల్లం'), description: 'Golden jaggery made without hydros or soda.', unit: 'kg', price: 95, stock: 200, minOrderQty: 1, bulkTiers: [{ minQty: 10, price: 85 }] },
];

export const customers = [
  {
    name: 'Priya Raman',
    email: 'customer@mannu.in',
    phone: '9886012345',
    language: 'en',
    addresses: [
      { label: 'Home', fullName: 'Priya Raman', phone: '9886012345', line1: '#42, 3rd Cross, Brookefield Layout', line2: 'Near ITPL Main Road', city: 'Bengaluru', district: 'Bengaluru Urban', state: 'Karnataka', pincode: '560037', isDefault: true },
    ],
  },
  {
    name: 'Arun Kumar',
    email: 'arun@mannu.in',
    phone: '9845098765',
    language: 'ta',
    addresses: [
      { label: 'Hotel', fullName: 'Arun Kumar (Annapoorna Mess)', phone: '9845098765', line1: '17, Old Madras Road', line2: 'KR Puram', city: 'Bengaluru', district: 'Bengaluru Urban', state: 'Karnataka', pincode: '560036', isDefault: true },
    ],
  },
];

export const admin = { name: 'Mannu Admin', email: 'admin@mannu.in', phone: '9000000001' };
