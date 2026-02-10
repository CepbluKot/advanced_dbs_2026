db.products.updateMany(
  { stock_count: { $gt: 100 } },
  { $push: { tags: "best-seller" } }
)

db.products.find({ tags: "best-seller" })