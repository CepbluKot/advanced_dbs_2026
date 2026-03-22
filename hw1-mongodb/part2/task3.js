db.products.find({ name: "4K Monitor" })

db.products.updateOne({ name: "8K Monitor" }, { $set: { price: 2000, brand: "ViewSonic" } }, { upsert: true })

db.products.find({ name: "8K Monitor" })
