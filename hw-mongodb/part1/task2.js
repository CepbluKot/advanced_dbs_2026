db.products.find({ brand: "TechCorp" })

db.products.find({ price: { $lte: 100 } })

db.products.find(
  { 
    category: "peripherals", 
    in_stock: false 
  },
  { 
    name: 1, 
    brand: 1, 
    _id: 0 
  }
)