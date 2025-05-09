// // const a = [0, 1.52, 11.24];
// // const b = [2.32, 0, 10.1];
// // function cal(a, b) {
// //   let sum = 0;
// //   for (let i = 0; i < a.length; i++) {
// //     let diff = (a[i] - b[i]) ** 2;

// //     sum += diff;
// //   }
// //   let result = Math.sqrt(sum);
// //   return result;
// // }

// const final = cal(a, b);
// console.log(final);

// //學一下new map new set用法
// const nameAndAge = new Map();

// //把一個key and value 加入這個map裡面
// nameAndAge.set("David", 21);
// //這裡會輸出  Map(1) { 'David' => 21 }
// console.log(nameAndAge);

// //讓程式碼去找David所map到的年齡，如果反向查例如給21結果會是undefined
// const getName = nameAndAge.get("David");
// console.log(getName);

// //讓程式碼檢查以下判斷是否屬實，因為確實有David所以會回傳True，反過來查詢也就是使用21會回傳false
// const checkName = nameAndAge.has("David");
// console.log(checkName);

// //取得map的大小
// nameAndAge.set("Kevin", 16);
// const thisMapSize = nameAndAge.size;
// //多加了一個Kevin，理論上應該是要回傳2
// console.log(thisMapSize);

// //玩一下迭代(先多加幾筆資料進去)
// nameAndAge.set("John", 5).set("Chris", 19).set("Olivia", 40);
// console.log(nameAndAge);
// //加個難度十歲以下該年齡*1，10~20*2，20以上*3
// //這邊迭代下去就是會以名字為順序把年齡都打出來
// let totalAge = 0;
// nameAndAge.forEach((value) => {
//   if (value <= 10) {
//     totalAge += value;
//   } else if (10 < value && value <= 20) {
//     totalAge += value * 2;
//   } else {
//     totalAge += value * 3;
//   }
// });
// console.log(totalAge);

// //可以使用delete刪除，這時候再使用has去判斷有沒有David就會回傳false
// nameAndAge.delete("David");
// const afterDeletedDavid = nameAndAge.has("David");
// console.log(afterDeletedDavid);

// //用clear全部刪除
// nameAndAge.clear();
// //會回傳 Map(0) {}
// console.log(nameAndAge);

// // let a = [1, 2, 3];
// let b = [4, 5, 6];
// let c = [b, a];
// console.log(c);

// const sequence = [c.sort((a, b) => a[0] - b[0])];
// console.log(sequence);

// // let a = [2, 7, 5, 1, 6, 4, 3];
// // a.sort((a, b) => a - b);
// console.log(a);

const a = [
  [1, 13],
  [35, 5],
];
const latter = a.map((arr) => arr[1]);
console.log(...latter);
