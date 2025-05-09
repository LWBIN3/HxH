document.addEventListener("DOMContentLoaded", async function () {
  // 解析原本主要頁面傳來的資訊，包含材料名稱name以及材料的其他數據data
  const params = new URLSearchParams(window.location.search);
  const materialName = params.get("name");
  const materialData = params.get("data")
    ? JSON.parse(decodeURIComponent(params.get("data")))
    : null;
  // Overview的部份
  if (materialName && materialData) {
    document.querySelector(".material-info").innerHTML = `
            <h1>${materialName}</h1>
            </br>
            <h2>Structure info:</h2>
            <p>layer group: ${materialData.layergroup}
            <p>layer group number: ${materialData.lgnum || "N/A"}
            <p>Structure origin: ${materialData.label || "N/A"}
            </br>
            </br>
            <h2>Stability:</h2>
            <p>Energy above convex hull[eV/atom]: ${
              materialData.ehull.toFixed(3) || "N/A"
            } eV</p>
            <p>Heat of formation: ${
              materialData.hform.toFixed(3) || "N/A"
            } eV</p>
            <p>Dynamically stable: ${materialData.dyn_stab || "N/A"} </p>
            </br>
            <h2>Basic properties:</h2>
            <p>Magnetic: ${materialData.magstate === "FM" ? "Yes" : "No"} </p>
            <p>Out of plane dipole[e Å/unit cell]: 0 </p>
            <p>Band gap[eV]: ${materialData.gap || "N/A"} </p>
  
        `;
  } else {
    document.querySelector(
      ".material-info"
    ).innerHTML = `<h2>Material Not Found</h2>`;
  }

  // 處理使用者點擊不同標籤時頁面要進行的刷新
  const contentArea = document.querySelector(".material-details");
  const statsItems = document.querySelectorAll(".stat-item");
  // 定義不同標籤對應的內容
  const contentMap = {
    crystal: {
      title: "Symmetries",
      description: "abcdefgh",
    },
    stability: {
      title: "Stability",
      description: "abcdefg",
    },
    stiffness: {
      title: "Stiffness Tensor",
      description: "abcdef",
    },
    electronic: {
      title: "Electronic Bands",
      description: "abcde",
    },
    bader: {
      title: "Bader Charges",
      description: "abcd",
    },
    optical: {
      title: "Optical Polarizability",
      description: "abc",
    },
  };

  // 預設顯示 crystal 內容
  function showContent(selectedId) {
    const newContent = contentMap[selectedId];
    if (newContent) {
      contentArea.innerHTML = `
          <h2>${newContent.title}</h2>
          <p>${newContent.description}</p>
        `;
    }

    // 移除所有 active 類別並標記當前選項
    statsItems.forEach((el) => el.classList.remove("active"));
    document
      .querySelector(`.stat-item[data-id="${selectedId}"]`)
      .classList.add("active");
  }

  // 頁面載入時預設顯示 crystal 的內容
  showContent("crystal");

  // 點擊事件處理
  statsItems.forEach((item) => {
    item.addEventListener("click", function () {
      const selectedId = this.getAttribute("data-id");
      if (selectedId !== "visualization") {
        showContent(selectedId);
      }
    });
  });

  // 視覺化相關的處理

  const dropdown = document.querySelector(".dropdown");
  const dropdownButton = dropdown.querySelector(".dropdown-button");
  const dropdownContent = dropdown.querySelector(".dropdown-content");
  const mainDropdownItems = dropdownContent.querySelectorAll(".dropdown-item");
  let currentPeriodicSize = "1x1x1"; // 默認週期性大小

  // 點擊按鈕時顯示/隱藏下拉選單
  dropdownButton.addEventListener("click", (e) => {
    dropdownContent.classList.toggle("show");
    e.stopPropagation();
  });

  // 處理主選單項目點擊
  mainDropdownItems.forEach((item) => {
    item.addEventListener("click", async function (e) {
      const action = this.textContent.trim();

      if (action === "Hide") {
        // 隱藏視覺化
        document.getElementById("plot").innerHTML = "";
        dropdownButton.querySelector(".button-text").textContent = "Hide";
      } else if (this.classList.contains("has-submenu")) {
        // 展開子選單，不執行其他操作
        e.stopPropagation();
        return;
      }

      dropdownContent.classList.remove("show");
    });
  });

  // 處理週期性子選單點擊
  const periodicItems = document.querySelectorAll(".submenu .dropdown-item");
  periodicItems.forEach((item) => {
    item.addEventListener("click", async function (e) {
      e.stopPropagation();
      currentPeriodicSize = this.textContent.trim();
      dropdownButton.querySelector(".button-text").textContent = "Show";

      // 獲取材料數據並顯示視覺化
      if (materialName && atomicNumbers) {
        const structureData = await initCheck(materialName, atomicNumbers);
        if (structureData) {
          // 將 1*1*1 格式轉換為 1x1 格式
          const periodicSize = currentPeriodicSize
            .replace(/\*/g, "x")
            .slice(0, -2);
          initStructure(structureData, periodicSize);
        }
      }

      dropdownContent.classList.remove("show");
    });
  });

  // 點擊其他地方時關閉下拉選單
  document.addEventListener("click", (e) => {
    if (!dropdown.contains(e.target)) {
      dropdownContent.classList.remove("show");
    }
  });

  // 解析材料名稱並獲取原子序號
  const materialList = parseChemicalFormula(materialName);
  const atomicNumbers = materialList.map((element) => elementMap[element]);

  // 初始化時嘗試獲取並顯示結構
  if (materialList.length > 0) {
    try {
      const structureData = await initCheck(materialName, atomicNumbers);
      if (structureData) {
        console.log("Initialized data:", structureData);
      }
    } catch (error) {
      console.error("Failed to catch data", error);
    }
  }
});

// 開始處理材料視覺化
async function initCheck(materialName, atomicNumbers) {
  try {
    const response = await fetch("http://localhost:3000/api/infovisualize");
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const apiData = await response.json();

    let matchedData = null;
    for (const item of apiData) {
      const entryNumbers = item["1"].numbers;
      if (
        Array.isArray(entryNumbers) &&
        areArraysEquivalent(entryNumbers, atomicNumbers)
      ) {
        matchedData = item["1"];
        console.log("Match found：", entryNumbers, atomicNumbers);
        break;
      }
    }

    if (!matchedData) {
      document.getElementById("plot").innerHTML = "Nothing was found";
      return null;
    }

    return matchedData; // 返回數據而不是直接初始化
  } catch (error) {
    console.error("數據獲取錯誤:", error);
    document.getElementById("plot").innerHTML = "數據加載失敗";
    return null;
  }
}

// 輔助函數：檢查兩個數組是否匹配
function arraysMatch(arr1, arr2) {
  if (arr1.length !== arr2.length) return false;
  return arr1.every((num, index) => num === arr2[index]);
}

function createAtomCountMap(numbers) {
  return numbers.reduce((map, num) => {
    map[num] = (map[num] || 0) + 1;
    return map;
  }, {});
}

// 嘗試找到目標材料有沒有和材料庫裡面的有match到
function areArraysEquivalent(arr1, arr2) {
  // 如果長度不同，直接返回 false
  if (arr1.length !== arr2.length) return false;

  // 創建兩個數組的原子計數映射
  const count1 = createAtomCountMap(arr1);
  const count2 = createAtomCountMap(arr2);

  // 比較兩個映射是否相等
  return (
    Object.keys(count1).every((key) => count1[key] === count2[key]) &&
    Object.keys(count2).every((key) => count1[key] === count2[key])
  );
}

function initStructure(data, periodicSize) {
  try {
    // 檢查數據格式
    console.log("Received data:", data);

    // 適應不同的數據格式
    const cellData = Array.isArray(data.cell)
      ? data.cell.flat()
      : data.cell.array?.__ndarray__?.[2] || [];

    const positions = Array.isArray(data.positions)
      ? data.positions
      : data.positions.__ndarray__?.[2] || [];

    const numbers = Array.isArray(data.numbers)
      ? data.numbers
      : data.numbers.__ndarray__?.[2] || [];

    // 轉換晶格數據
    const cell = [
      cellData.slice(0, 3),
      cellData.slice(3, 6),
      cellData.slice(6, 9),
    ];

    // 轉換原子位置數據
    const atoms = [];
    for (let i = 0; i < positions.length; i++) {
      atoms.push({
        x: positions[i][0],
        y: positions[i][1],
        z: positions[i][2],
        element: getElementSymbol(numbers[i]),
      });
    }

    console.log("Processed data:", {
      cell: cell,
      atoms: atoms,
    });

    createStructureVisualization(atoms, cell, periodicSize);
  } catch (error) {
    console.error("Data processing error:", error);
    console.error("Wrong data:", data);
    document.getElementById("plot").innerHTML =
      "Data processing error: " + error.message;
  }
}

function parseChemicalFormula(formula) {
  let pos = 0;
  const elements = [];
  //prettier-ignore
  const subscriptMap = {
        '₀': 0, '₁': 1, '₂': 2, '₃': 3, '₄': 4,
        '₅': 5, '₆': 6, '₇': 7, '₈': 8, '₉': 9
      };

  while (pos < formula.length) {
    const elementMatch = formula.slice(pos).match(/^[A-Z][a-z]?/);
    if (!elementMatch) break;

    const element = elementMatch[0];
    pos += element.length;

    let number = "";
    while (pos < formula.length && subscriptMap.hasOwnProperty(formula[pos])) {
      number += subscriptMap[formula[pos]];
      pos++;
    }

    const count = number ? parseInt(number) : 1;

    for (let i = 0; i < count; i++) {
      elements.push(element);
    }
  }

  return elements;
}

//prettier-ignore
const elementMap = {
  H: 1, He: 2, Li: 3, Be: 4, B: 5, C: 6, N: 7, O: 8, F: 9, Ne: 10,
  Na: 11, Mg: 12, Al: 13, Si: 14, P: 15, S: 16, Cl: 17, Ar: 18,
  K: 19, Ca: 20, Sc: 21, Ti: 22, V: 23, Cr: 24, Mn: 25, Fe: 26,
  Co: 27, Ni: 28, Cu: 29, Zn: 30, Ga: 31, Ge: 32, As: 33, Se: 34,
  Br: 35, Kr: 36, Rb: 37, Sr: 38, Y: 39, Zr: 40, Nb: 41, Mo: 42,
  Tc: 43, Ru: 44, Rh: 45, Pd: 46, Ag: 47, Cd: 48, In: 49, Sn: 50,
  Sb: 51, Te: 52, I: 53, Xe: 54, Cs: 55, Ba: 56, La: 57, Ce: 58,
  Pr: 59, Nd: 60, Pm: 61, Sm: 62, Eu: 63, Gd: 64, Tb: 65, Dy: 66,
  Ho: 67, Er: 68, Tm: 69, Yb: 70, Lu: 71, Hf: 72, Ta: 73, W: 74,
  Re: 75, Os: 76, Ir: 77, Pt: 78, Au: 79, Hg: 80
};

function getBondTypes(atoms) {
  const points = atoms.map((atom) => [atom.x, atom.y, atom.z]);
  const pointToAtom = new Map();
  points.forEach((point, index) => {
    pointToAtom.set(point, atoms[index]);
  });

  function distanceFunc(a, b) {
    return Math.sqrt(
      Math.pow(a[0] - b[0], 2) +
        Math.pow(a[1] - b[1], 2) +
        Math.pow(a[2] - b[2], 2)
    );
  }
  // [0,1,2]表示三維
  const tree = new kdTree(points, distanceFunc, [0, 1, 2]);

  const minimumDistances = new Map();
  points.forEach((point) => {
    const neighbors = tree
      .nearest(point, 4, Infinity)
      //4表示搜尋附近最近四個點
      //這邊會產生的結果大概會是
      //[[1.7005742179142118, 0.929999402709079, 9.920236415723988], 3.521]
      //[最近的那個點,兩者之間的距離]
      .filter(([neighborPoint, dist]) => dist > 0.01);
    //要把自己給扣掉所以多加個filter過濾掉
    if (neighbors.length >= 3) {
      const [nearestPoint, d1] = neighbors[0]; //第三近鄰
      const [secondNearestPoint, d2] = neighbors[1]; //第二近鄰
      const [thirdNearestPoint, d3] = neighbors[2]; //最近鄰
      const dmin = (d3 + d2 + d1) / 3; //用平均算出dmin

      //全部加回minimumDistances，其中會包含每個點然後那個點到最近鄰元素的距離
      //使用join把數據全部都串在一起，原本是[]，現在會變成""，用join把array變成string，比較好看
      minimumDistances.set(point.join(","), dmin);
      // console.log(`Point: ${point}, D1: ${d1}, D2: ${d2}, Dmin: ${dmin}`);
    } else if (neighbors.length === 1) {
      // 如果只有一個鄰居（邊界情況），直接使用 d1
      const [nearestPoint, d1] = neighbors[0];
      minimumDistances.set(point.join(","), d1);
      // console.log(`Point: ${point}, Only D1: ${d1}`);
    }
  });

  const delta = 0.1;
  const bonds = [];
  const processedPairs = new Set();

  points.forEach((point) => {
    //透過已知的點去查找該點所對應的原子
    const atom = pointToAtom.get(point);
    const dmin = minimumDistances.get(point.join(","));
    //如果沒有找到最小距離那就跳過
    if (!dmin) return;

    const initialThreshold = Infinity; //先用大範圍，等等再精準一點
    const potentialBonds = tree
      .nearest(point, 18, initialThreshold)
      .filter(([neighborPoint, dist]) => dist > 0.01);
    //這邊使用sort
    potentialBonds.forEach(([neighborPoint, dist]) => {
      const neighborAtom = pointToAtom.get(neighborPoint);

      //動態地去計算Dcut-off (based on atomic radius)
      const r1 = getAtomRadius(atom.element) / 100;
      const r2 = getAtomRadius(neighborAtom.element) / 100; // 默認值 100 pm
      // console.log(radii);
      const dcutoff = r1 + r2 + 0.45;
      // const dcutoff = (1 + delta) * dmin;
      // console.log(`dcutoff ${dcutoff}`);

      if (dist <= dcutoff) {
        const pairKey = [
          [point, neighborPoint].sort((a, b) => a[0] - b[0])[0].join(","),
          [point, neighborPoint].sort((a, b) => a[0] - b[0])[1].join(","),
        ].join("|");

        if (!processedPairs.has(pairKey)) {
          processedPairs.add(pairKey);
          bonds.push({
            from: {
              x: point[0],
              y: point[1],
              z: point[2],
              element: atom.element,
            },
            to: {
              x: neighborPoint[0],
              y: neighborPoint[1],
              z: neighborPoint[2],
              element: neighborAtom.element,
            },
            distance: dist,
            type: "bond",
          });
        }
      }
    });
  });
  // console.log(bonds);
  // console.log(`${bonds.length} bonds were detected`);

  // 修改返回對象，包含 minimumDistances
  return { bonds, bondTypes: ["bond"], minimumDistances };
}

function createBonds(atoms, cell, bondInfo) {
  const { bonds } = bondInfo;
  const traces = [];

  bonds.forEach((bond) => {
    // 計算總距離
    const totalDistance = bond.distance;

    // 獲取原子半徑
    const r1 = getAtomRadius(bond.from.element) * 0.006;
    const r2 = getAtomRadius(bond.to.element) * 0.006;

    // 計算兩原子中心之間的向量
    const dx = bond.to.x - bond.from.x;
    const dy = bond.to.y - bond.from.y;
    const dz = bond.to.z - bond.from.z;

    // 計算調整後的中點位置（從第一個原子表面開始）
    const t = r1 / totalDistance; // 第一個原子表面的比例位置

    // 從第一個原子表面開始的點
    const surfaceStartX = bond.from.x + dx * t;
    const surfaceStartY = bond.from.y + dy * t;
    const surfaceStartZ = bond.from.z + dz * t;

    // 第二個原子表面開始的點
    const surfaceEndX = bond.to.x - dx * (r2 / totalDistance);
    const surfaceEndY = bond.to.y - dy * (r2 / totalDistance);
    const surfaceEndZ = bond.to.z - dz * (r2 / totalDistance);

    // 計算鍵結的中點
    const midX = (surfaceStartX + surfaceEndX) / 2;
    const midY = (surfaceStartY + surfaceEndY) / 2;
    const midZ = (surfaceStartZ + surfaceEndZ) / 2;

    // 計算鍵結的半徑
    const bondRadius = 0.12;

    // 為第一個原子創建半圓柱體（從原子表面到中點）
    const cylinder1 = generateCylinderPoints(
      surfaceStartX,
      surfaceStartY,
      surfaceStartZ,
      midX,
      midY,
      midZ,
      bondRadius
    );

    cylinder1.color = getAtomColor(bond.from.element);
    cylinder1.hoverinfo = "text";
    cylinder1.text = `${bond.from.element}-${
      bond.to.element
    }: ${bond.distance.toFixed(3)} Å`;
    cylinder1.name = `${bond.from.element}-${bond.to.element}`;
    cylinder1.opacity = 1;

    traces.push(cylinder1);

    // 為第二個原子創建半圓柱體（從中點到原子表面）
    const cylinder2 = generateCylinderPoints(
      midX,
      midY,
      midZ,
      surfaceEndX,
      surfaceEndY,
      surfaceEndZ,
      bondRadius
    );

    cylinder2.color = getAtomColor(bond.to.element);
    cylinder2.hoverinfo = "text";
    cylinder2.text = `${bond.from.element}-${
      bond.to.element
    }: ${bond.distance.toFixed(3)} Å`;
    cylinder2.name = `${bond.from.element}-${bond.to.element}`;
    cylinder2.opacity = 1;

    traces.push(cylinder2);
  });

  return traces;
}

function createStructureVisualization(atoms, cell, periodicSize = "1x1") {
  // 處理週期性展開
  console.time("xtime");
  const [nx, ny] = periodicSize.split("x").map(Number);
  const expandedAtoms = [];

  // 展開原子
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < ny; j++) {
      atoms.forEach((atom) => {
        expandedAtoms.push({
          x: atom.x + i * cell[0][0] + j * cell[1][0],
          y: atom.y + i * cell[0][1] + j * cell[1][1],
          z: atom.z + i * cell[0][2] + j * cell[1][2],
          element: atom.element,
        });
      });
    }
  }
  // 直接在展開後的原子上計算鍵結
  const bondInfo = getBondTypes(expandedAtoms);
  const expandedBonds = bondInfo.bonds;

  // 準備視覺化數據
  let data = [];

  // 添加所有原子
  expandedAtoms.forEach((atom) => {
    const radius = getAtomRadius(atom.element) * 0.006;
    const points = generateSpherePoints(atom.x, atom.y, atom.z, radius);
    data.push({
      type: "mesh3d",
      x: points.x,
      y: points.y,
      z: points.z,
      alphahull: 0,
      color: getAtomColor(atom.element),
      opacity: 1,
      name: atom.element,
      hoverinfo: "text",
      text: `${atom.element} (${atom.x.toFixed(2)}, ${atom.y.toFixed(
        2
      )}, ${atom.z.toFixed(2)})`,
      lighting: {
        ambient: 0.6,
        diffuse: 0.9,
        specular: 0.4,
        roughness: 0.7,
        fresnel: 0.2,
      },
    });
  });

  // 添加鍵結
  const bondTraces = createBonds(expandedAtoms, cell, bondInfo);
  data.push(...bondTraces);

  // 創建擴展的晶格框
  const expandedCell = [
    [cell[0][0] * nx, cell[0][1], cell[0][2]],
    [cell[1][0], cell[1][1] * ny, cell[1][2]],
    [cell[2][0], cell[2][1], cell[2][2]],
  ];
  const latticeTraces = createLatticeBox(expandedCell);
  data.push(...latticeTraces);

  // 設置布局
  const layout = {
    scene: {
      xaxis: {
        title: "X",
        showspikes: false,
        showgrid: false,
        zeroline: false,
        visible: false,
      },
      yaxis: {
        title: "Y",
        showspikes: false,
        showgrid: false,
        zeroline: false,
        visible: false,
      },
      zaxis: {
        title: "Z",
        showspikes: false,
        showgrid: false,
        zeroline: false,
        visible: false,
      },
      aspectmode: "data",
      camera: {
        eye: { x: 1.5, y: 1.5, z: 1.5 },
        projection: { type: "orthographic" },
      },
      bgcolor: "#2a2d35",
    },
    margin: { l: 0, r: 0, b: 0, t: 0 },
    showlegend: false,
    width: 800,
    height: 450,
    paper_bgcolor: "#2a2d35",
    plot_bgcolor: "#2a2d35",
  };

  // 繪製視覺化
  Plotly.newPlot("plot", data, layout, {
    responsive: true,
    displayModeBar: true,
    displaylogo: false,
    modeBarButtonsToRemove: ["toImage", "sendDataToCloud"],
  });
  console.timeEnd("xtime");
}

function generateSpherePoints(centerX, centerY, centerZ, radius) {
  const points = { x: [], y: [], z: [] };
  const segments = 20;
  const golden_ratio = (1 + Math.sqrt(5)) / 2;
  const angle_increment = Math.PI * 2 * golden_ratio;

  // 使用斐波那契球面分佈來生成點
  for (let i = 0; i < segments * segments; i++) {
    const t = i / (segments * segments - 1); //讓t歸一化，介於[0,1]
    const inclination = Math.acos(1 - 2 * t); //極角，括弧裡面[1,-1]，也就是arccos可以運作的範圍
    const azimuth = angle_increment * i; //方位角

    const x = centerX + radius * Math.sin(inclination) * Math.cos(azimuth);
    const y = centerY + radius * Math.sin(inclination) * Math.sin(azimuth);
    const z = centerZ + radius * Math.cos(inclination);

    points.x.push(x);
    points.y.push(y);
    points.z.push(z);
  }

  return points;
}

// 向量運算輔助函數，協助generateCylinderPoints進行生成
function normalize(vector) {
  const length = Math.sqrt(
    vector[0] * vector[0] + vector[1] * vector[1] + vector[2] * vector[2]
  );
  return [vector[0] / length, vector[1] / length, vector[2] / length];
}

function crossProduct(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

//嘗試使用cylinder來書寫bonding的形成
function generateCylinderPoints(x1, y1, z1, x2, y2, z2, radius) {
  const segments = 16;
  const vertices = [];
  const indices = [];

  // 計算圓柱體方向向量
  const direction = [x2 - x1, y2 - y1, z2 - z1];
  const directionNorm = normalize(direction);

  // 創建一個垂直於方向向量的向量
  let perpendicular;
  if (Math.abs(directionNorm[1]) < 0.9) {
    // 如果方向向量不是接近垂直，使用y軸叉積
    perpendicular = normalize(crossProduct([0, 1, 0], directionNorm));
  } else {
    // 如果方向向量接近垂直，使用z軸叉積
    perpendicular = normalize(crossProduct([0, 0, 1], directionNorm));
  }

  // 計算第二個垂直向量完成正交基底
  const perpendicular2 = crossProduct(directionNorm, perpendicular);

  // 創建圓柱體的頂點
  for (let i = 0; i <= segments; i++) {
    const theta = (i * 2 * Math.PI) / segments;
    const cosTheta = Math.cos(theta);
    const sinTheta = Math.sin(theta);

    // 使用正交基底計算圓周上的點
    const rx = perpendicular[0] * cosTheta + perpendicular2[0] * sinTheta;
    const ry = perpendicular[1] * cosTheta + perpendicular2[1] * sinTheta;
    const rz = perpendicular[2] * cosTheta + perpendicular2[2] * sinTheta;

    // 底部頂點
    vertices.push([x1 + radius * rx, y1 + radius * ry, z1 + radius * rz]);

    // 頂部頂點
    vertices.push([x2 + radius * rx, y2 + radius * ry, z2 + radius * rz]);
  }

  // 生成三角形索引
  for (let i = 0; i < segments * 2; i += 2) {
    indices.push(i, i + 1, i + 2, i + 1, i + 3, i + 2);
  }

  const x = vertices.map((v) => v[0]);
  const y = vertices.map((v) => v[1]);
  const z = vertices.map((v) => v[2]);

  return {
    type: "mesh3d",
    x: x,
    y: y,
    z: z,
    i: indices.filter((_, i) => i % 3 === 0),
    j: indices.filter((_, i) => i % 3 === 1),
    k: indices.filter((_, i) => i % 3 === 2),
    color: "gray",
    opacity: 1,
  };
}

function createLatticeBox(cell) {
  const [a, b, c] = cell;
  const vertices = [
    [0, 0, 0],
    [...a],
    [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
    [...b],
    [...c],
    [c[0] + a[0], c[1] + a[1], c[2] + a[2]],
    [c[0] + a[0] + b[0], c[1] + a[1] + b[1], c[2] + a[2] + b[2]],
    [c[0] + b[0], c[1] + b[1], c[2] + b[2]],
  ];

  // 創建三個基向量的跡線
  const baseVectors = [
    {
      // a 向量 (紅色)
      x: [0, a[0]],
      y: [0, a[1]],
      z: [0, a[2]],
      color: "red",
      name: "a",
    },
    {
      // b 向量 (綠色)
      x: [0, b[0]],
      y: [0, b[1]],
      z: [0, b[2]],
      color: "green",
      name: "b",
    },
    {
      // c 向量 (藍色)
      x: [0, c[0]],
      y: [0, c[1]],
      z: [0, c[2]],
      color: "blue",
      name: "c",
    },
  ];

  // 創建完整的晶格框（灰色）
  const edges = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 0], // 底部
    [4, 5],
    [5, 6],
    [6, 7],
    [7, 4], // 頂部
    [0, 4],
    [1, 5],
    [2, 6],
    [3, 7], // 連接線
  ];

  const traces = [];

  // 添加基向量
  baseVectors.forEach((vector) => {
    traces.push({
      type: "scatter3d",
      mode: "lines",
      x: vector.x,
      y: vector.y,
      z: vector.z,
      line: {
        width: 10,
        color: vector.color,
      },
      name: vector.name,
      showlegend: false,
      hoverinfo: "none",
    });
  });

  // 添加完整晶格框
  traces.push({
    type: "scatter3d",
    mode: "lines",
    x: edges.flatMap(([i, j]) => [vertices[i][0], vertices[j][0], null]),
    y: edges.flatMap(([i, j]) => [vertices[i][1], vertices[j][1], null]),
    z: edges.flatMap(([i, j]) => [vertices[i][2], vertices[j][2], null]),
    line: {
      width: 2.5,
      color: "grey",
    },
    hoverinfo: "none",
    showlegend: false,
  });

  return traces;
}

//prettier-ignore
function getAtomColor(element) {
  const colors = {
    H: "#FFFFFF", He: "#D9FFFF", Li: "#CC80FF", Be: "#C2FF00", B: "#FFB5B5", C: "#909090", N: "#3050F8", O: "#FF0D0D",
    F: "#90E050", Ne: "#B3E3F5", Na: "#AB5CF2", Mg: "#8AFF00", Al: "#BFA6A6", Si: "#F0C8A0", P: "#FF8000", S: "#FFFF30",
    Cl: "#1FF01F", Ar: "#80D1E3", K: "#8F40D4", Ca: "#3DFF00", Sc: "#E6E6E6", Ti: "#BFC2C7", V: "#A6A6AB",
    Cr: "#8A99C7", Mn: "#9C7AC7", Fe: "#E06633", Co: "#F090A0", Ni: "#50D050", Cu: "#C88033", Zn: "#7D80B0", Ga: "#C28F8F",
    Ge: "#668F8F", As: "#BD80E3", Se: "#FFA100", Br: "#A62929", Kr: "#5CB8D1", Rb: "#702EB0", Sr: "#00FF00", Y: "#94FFFF",
    Zr: "#94E0E0", Nb: "#73C2C9", Mo: "#54B5B5", Tc: "#3B9E9E", Ru: "#248F8F", Rh: "#0A7D8C", Pd: "#006985",
    Ag: "#C0C0C0", Cd: "#FFD98F", In: "#A67573", Sn: "#668080", Sb: "#9E63B5", Te: "#D47A00", I: "#940094",
    Xe: "#429EB0", Cs: "#57178F", Ba: "#00C900", La: "#70D4FF", Ce: "#FFFFC7", Pr: "#D9FFC7", Nd: "#C7FFC7",
    Pm: "#A3FFC7", Sm: "#8FFFC7", Eu: "#61FFC7", Gd: "#45FFC7", Tb: "#30FFC7", Dy: "#1FFFC7", Ho: "#00FF9C",
    Er: "#00E675", Tm: "#00D452", Yb: "#00BF38", Lu: "#00AB24", Hf: "#4DC2FF", Ta: "#4DA6FF", W: "#2194D6",
    Re: "#267DAB", Os: "#266696", Ir: "#175487", Pt: "#D0D0E0", Au: "#FFD123", Hg: "#B8B8D0"
  };
  return colors[element] || "#808080"; // 默認顏色為灰色
}

//prettier-ignore
function getAtomRadius(element) {
  const radii = {
    H: 53, He: 31, Li: 167, Be: 112, B: 87, C: 67, N: 56, O: 48, F: 42, Ne: 38,
    Na: 190, Mg: 145, Al: 118, Si: 111, P: 98, S: 87, Cl: 79, Ar: 71,
    K: 243, Ca: 194, Sc: 184, Ti: 176, V: 171, Cr: 166, Mn: 161, Fe: 156,
    Co: 152, Ni: 149, Cu: 145, Zn: 142, Ga: 136, Ge: 125, As: 114, Se: 103,
    Br: 94, Kr: 87, Rb: 265, Sr: 219, Y: 212, Zr: 206, Nb: 198, Mo: 190,
    Tc: 183, Ru: 178, Rh: 173, Pd: 169, Ag: 165, Cd: 161, In: 156, Sn: 145,
    Sb: 133, Te: 123, I: 115, Xe: 108, Cs: 298, Ba: 253, La: NaN, Ce: NaN,
    Pr: 247, Nd: 206, Pm: 205, Sm: 238, Eu: 231, Gd: 233, Tb: 225, Dy: 228,
    Ho: 226, Er: 226, Tm: 222, Yb: 222, Lu: 217, Hf: 208, Ta: 200, W: 193,
    Re: 188, Os: 185, Ir: 180, Pt: 177, Au: 174, Hg: 171, Tl: 156, Pb: 154
  };
  
    return radii[element] || 0.5; // my default radius
  }
function getElementSymbol(atomicNumber) {
  const reverseElementMap = Object.entries(elementMap).reduce(
    (acc, [key, value]) => {
      acc[value] = key;
      return acc;
    },
    {}
  );
  return reverseElementMap[atomicNumber] || "Unknown";
}
// 監聽視窗大小改變
window.addEventListener("resize", function () {
  Plotly.Plots.resize("plot");
});

// function createBonds(atoms, cell, bondInfo) {
//   const { bonds } = bondInfo;
//   const traces = [];

//   const x = [];
//   const y = [];
//   const z = [];
//   const hovertext = [];

//   bonds.forEach((bond) => {
//     x.push(bond.from.x, bond.to.x, null);
//     y.push(bond.from.y, bond.to.y, null);
//     z.push(bond.from.z, bond.to.z, null);
//     hovertext.push(
//       `${bond.from.element}-${bond.to.element}: ${bond.distance.toFixed(3)} Å`,
//       `${bond.from.element}-${bond.to.element}: ${bond.distance.toFixed(3)} Å`,
//       null
//     );
//   });

//   traces.push({
//     type: "scatter3d",
//     mode: "lines",
//     x: x,
//     y: y,
//     z: z,
//     line: {
//       width: 5,
//       color: "#888888",
//     },
//     hoverinfo: "text",
//     text: hovertext,
//     name: "Chemical Bonds",
//     showlegend: true,
//   });

//   return traces;
// }
// function createBonds(atoms, cell, bondInfo) {
//   const { bonds } = bondInfo;
//   const traces = [];

//   bonds.forEach((bond) => {
//     // 計算總距離
//     const totalDistance = bond.distance;

//     // 獲取原子半徑
//     const r1 = getAtomRadius(bond.from.element) * 0.006;
//     const r2 = getAtomRadius(bond.to.element) * 0.006;

//     // 計算兩原子中心之間的向量
//     const dx = bond.to.x - bond.from.x;
//     const dy = bond.to.y - bond.from.y;
//     const dz = bond.to.z - bond.from.z;

//     // 計算原子表面之間的實際距離
//     const surfaceDistance = totalDistance - r1 - r2;

//     // 計算調整後的中點位置（從第一個原子表面開始）
//     const t = r1 / totalDistance; // 第一個原子表面的比例位置
//     const t2 = (r1 + surfaceDistance / 2) / totalDistance; // 中點的比例位置

//     // 從第一個原子表面開始的點
//     const surfaceStartX = bond.from.x + dx * t;
//     const surfaceStartY = bond.from.y + dy * t;
//     const surfaceStartZ = bond.from.z + dz * t;

//     // 真正的中點位置
//     const midX = bond.from.x + dx * t2;
//     const midY = bond.from.y + dy * t2;
//     const midZ = bond.from.z + dz * t2;

//     // 第二個原子表面開始的點
//     const surfaceEndX = bond.to.x - dx * (r2 / totalDistance);
//     const surfaceEndY = bond.to.y - dy * (r2 / totalDistance);
//     const surfaceEndZ = bond.to.z - dz * (r2 / totalDistance);

//     // 第一個原子到中點的部分 (第一個原子的顏色)
//     traces.push({
//       type: "scatter3d",
//       mode: "lines",
//       x: [surfaceStartX, midX],
//       y: [surfaceStartY, midY],
//       z: [surfaceStartZ, midZ],
//       line: {
//         width: 8,
//         color: getAtomColor(bond.from.element),
//         opacity: 0.3,
//       },
//       hoverinfo: "text",
//       text: `${bond.from.element}-${bond.to.element}: ${bond.distance.toFixed(
//         3
//       )} Å`,
//       name: `${bond.from.element}-${bond.to.element}`,
//       showlegend: false,
//     });

//     // 中點到第二個原子的部分 (第二個原子的顏色)
//     traces.push({
//       type: "scatter3d",
//       mode: "lines",
//       x: [midX, surfaceEndX],
//       y: [midY, surfaceEndY],
//       z: [midZ, surfaceEndZ],
//       line: {
//         width: 8,
//         color: getAtomColor(bond.to.element),
//         opacity: 0.3,
//       },
//       hoverinfo: "text",
//       text: `${bond.from.element}-${bond.to.element}: ${bond.distance.toFixed(
//         3
//       )} Å`,
//       name: `${bond.from.element}-${bond.to.element}`,
//       showlegend: false,
//     });
//   });

//   return traces;
// }
