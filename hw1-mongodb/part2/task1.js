db.products.find({
  brand: { $ne: "TechCorp" },
  price: { $gte: 70, $lte: 500 }
})