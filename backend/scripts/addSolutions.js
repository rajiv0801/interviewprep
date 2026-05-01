const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Connected to DB');
    return mongoose.connection.db.collection('problems').updateOne(
      { _id: new mongoose.Types.ObjectId('698e16f874f4223a234586b6') },
      {
        $set: {
          solutions: [
            {
              language: 'javascript',
              code: `function equilibriumPoint(arr) {\n  let sum = 0;\n  let leftSum = 0;\n\n  for (let i = 0; i < arr.length; i++) {\n    sum += arr[i];\n  }\n\n  for (let i = 0; i < arr.length; i++) {\n    sum -= arr[i];\n\n    if (leftSum === sum) {\n      return i;\n    }\n\n    leftSum += arr[i];\n  }\n\n  return -1;\n}`
            },
            {
              language: 'python',
              code: `def equilibriumPoint(arr):\n    total_sum = sum(arr)\n    left_sum = 0\n    \n    for i in range(len(arr)):\n        total_sum -= arr[i]\n        if left_sum == total_sum:\n            return i\n        left_sum += arr[i]\n        \n    return -1`
            },
            {
              language: 'java',
              code: `class Solution {\n    public static int equilibriumPoint(int[] arr) {\n        int sum = 0;\n        int leftSum = 0;\n        \n        for (int i = 0; i < arr.length; i++) {\n            sum += arr[i];\n        }\n        \n        for (int i = 0; i < arr.length; i++) {\n            sum -= arr[i];\n            if (leftSum == sum) {\n                return i;\n            }\n            leftSum += arr[i];\n        }\n        \n        return -1;\n    }\n}`
            }
          ]
        }
      }
    );
  })
  .then((res) => {
    console.log('Modified Count:', res.modifiedCount);
    process.exit(0);
  })
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
