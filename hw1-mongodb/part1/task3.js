db.products.updateMany(
  { brand: "GamerGear" },
  { $set: { brand: "GamerPro" } }
)

db.products.find({ brand: "GamerPro" })


db.products.updateOne(
  { name: "Laptop Pro" },
  { $inc: { price: -100 } }
)

db.products.findOne({ name: "Laptop Pro" }, { price: 1 })