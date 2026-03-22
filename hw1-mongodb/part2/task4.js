db.test_delete.insertMany([
  { item: "test1", value: 10 },
  { item: "test2", value: 20 },
  { item: "test3", value: 30 },
  { item: "test4", value: 40 },
  { item: "test5", value: 50 }
])

db.test_delete.deleteMany({})