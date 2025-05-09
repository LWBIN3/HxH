const { kdTree } = require("kd-tree-javascript");

function distance(a, b) {
  return Math.sqrt(
    (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2
  );
}

// 二維材料的原子座標
const atoms = [
  { name: "Y", position: [-0.0, 0.0, 17.61040372] },
  { name: "Y", position: [1.96012717, 1.96012717, 21.51501628] },
  { name: "Se", position: [0.0, 1.96012717, 15.23090393] },
  { name: "Se", position: [1.96012717, 0.0, 23.89451607] },
  { name: "Se", position: [-0.0, 1.96012717, 23.89451607] },
  { name: "Se", position: [1.96012717, -0.0, 15.23090393] },
  { name: "Se", position: [-0.0, -0.0, 20.64666306] },
  { name: "Se", position: [1.96012717, 1.96012717, 18.47875694] },
];

// 建立 KD-Tree
const tree = new kdTree(
  atoms.map((atom) => atom.position),
  distance,
  [0, 1, 2] //這邊表示三維
);

const bonds = [];

// 遍歷每個原子
atoms.forEach((atom) => {
  // 搜尋 n 個最近的鄰居，因為第一個點通常是自己，所以要多抓一個
  const neighbors = tree.nearest(atom.position, 3, Infinity);
  console.log(neighbors);

  // 過濾掉自己（距離為 0 的點）
  const validNeighbors = neighbors.filter(([_, dist]) => dist > 0);

  if (validNeighbors.length > 0) {
    // 找到最小距離
    const minDistance = Math.min(...validNeighbors.map(([_, dist]) => dist));
    const secondMiniDistance = Math.max(
      ...validNeighbors.map(([_, dist]) => dist)
    );
    console.log(
      `firstNeighbor: ${minDistance}，secondNeighbor: ${secondMiniDistance}`
    );
    const bondingThreshold = minDistance * 1.1; // 取最小值後放大 1.1 倍

    console.log(
      `Atom: ${atom.name}, Min Distance: ${minDistance.toFixed(
        2
      )}, New Threshold: ${bondingThreshold.toFixed(2)}`
    );

    // 重新判斷 bonding
    validNeighbors.forEach(([neighborPos, dist]) => {
      if (dist < bondingThreshold) {
        bonds.push({
          from: atom.position,
          to: neighborPos,
          distance: dist,
        });
      }
    });
  }
});

// console.log("Detected Bonds:", bonds);
