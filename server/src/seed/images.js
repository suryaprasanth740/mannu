// Free photos from Unsplash (https://unsplash.com/license) used for the demo data.
// They are loaded from Unsplash's CDN. Run `npm run images:localize --prefix server`
// to copy them into your own storage (local uploads folder or Cloudinary) instead.

const U = (id, w = 900) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=70`;

export const photo = U;

/** Product photos, keyed by product name in data.js */
export const productPhotos = {
  'Tomato (Nati)': 'photo-1582284540020-8acbe03f4924',
  'Brinjal (Purple)': 'photo-1683543122945-513029986574',
  'Beans (French)': 'photo-1567375698348-5d9d5ae99de0',
  'Green chilli': 'photo-1504394448285-7adeab975d7d',
  'Sweet potato': 'photo-1730815048561-45df6f7f331d',
  'Avarekai (Field beans)': 'photo-1632640110804-58827a6b37fd',
  Coriander: 'photo-1723810330043-dd05647294cb',
  'Palak (Spinach)': 'photo-1574316071802-0d684efa7bf5',
  'Dantu soppu (Amaranth)': 'photo-1617884638394-d9eef1b0f40e',
  'Curry leaves': 'photo-1630409349197-b733a524b24e',
  'Cow milk (Nati)': 'photo-1601436423474-51738541c1b1',
  'Thick curd (Mosaru)': 'photo-1728910107657-a1806c4e22bf',
  'Guava (Allahabad Safeda)': 'photo-1561109430-e2fcfbf6aee9',
  'Custard apple (Seethaphal)': 'photo-1775679886812-5ff151b5cb84',
  'Badami mango': 'photo-1519096845289-95806ee03a1a',
  'Yelakki banana': 'photo-1603833665858-e61d17a86224',
  'Tomato (Hybrid, crate)': 'photo-1518977822534-7049a61ee0c2',
  'Ponni boiled rice': 'photo-1586201375761-83865001e31c',
  'Seeraga samba rice': 'photo-1686820740687-426a7b9b2043',
  'Sona masuri rice': 'photo-1723475158232-819e29803f4d',
  'Urad dal (whole, black)': 'photo-1502825868325-37569f642e95',
  'Green gram (Moong)': 'photo-1788629531508-c0d971473c37',
  'Ragi (Finger millet)': 'photo-1768729339998-909158957162',
  'Foxtail millet (Navane)': 'photo-1783042909392-0b8d8683e0a2',
  'Groundnut oil (wood-pressed)': 'photo-1621958180509-74e9a29b3758',
  'Fresh groundnut (in shell)': 'photo-1513868853742-e7fb786265db',
  'Horse gram (Huruli)': 'photo-1763368392508-3d4bddfdd20a',
  'Black pepper (Malabar)': 'photo-1755598603006-5cee23c4cb4e',
  'Green cardamom': 'photo-1642255486695-a52c59347cfa',
  'Turmeric powder': 'photo-1768729340164-7d83fe18384d',
  'Forest honey (500 g jar)': 'photo-1558642452-9d2a7deb7f62',
  'Tender coconut': 'photo-1566109964132-ec243417ca2d',
  'Jaggery cubes (chemical-free)': 'photo-1788238025855-55581a2ed354',
};

/** Farm cover photos (landscapes of the kind of farm, not portraits), keyed by farmer key */
export const farmCovers = {
  lakshmi: 'photo-1530541835461-dedaf9cf368a',
  ramesh: 'photo-1781571708224-b5cea74ecae4',
  murugan: 'photo-1694011772133-dc4b3ff3f24f',
  venkata: 'photo-1620901433789-1d2f85a93653',
  savitha: 'photo-1767632018975-217659cb271a',
  anjali: 'photo-1775619427924-16ff07cf2f2e',
};

/** Category tiles, keyed by category slug */
export const categoryPhotos = {
  vegetables: 'photo-1464226184884-fa280b87c399',
  'leafy-greens': 'photo-1574316071802-0d684efa7bf5',
  fruits: 'photo-1669207334420-66d0e3450283',
  'rice-millets': 'photo-1586201375761-83865001e31c',
  pulses: 'photo-1786994060314-eccbdd13066d',
  spices: 'photo-1771541897176-44a3e01dc484',
  'cold-pressed-oils': 'photo-1621958180509-74e9a29b3758',
  'honey-jaggery': 'photo-1558642452-9d2a7deb7f62',
  'milk-dairy': 'photo-1601436423474-51738541c1b1',
};
