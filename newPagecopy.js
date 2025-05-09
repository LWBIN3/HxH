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
        console.log("初始化獲取的結構數據:", structureData);
      }
    } catch (error) {
      console.error("獲取數據失敗:", error);
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
        console.log("找到匹配：", entryNumbers, atomicNumbers);
        break;
      }
    }

    if (!matchedData) {
      console.log("未找到匹配的數據");
      document.getElementById("plot").innerHTML = "未找到匹配的結構數據";
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
    console.log("接收到的數據:", data);

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

    console.log("處理後的數據:", {
      cell: cell,
      atoms: atoms,
    });

    createStructureVisualization(atoms, cell, periodicSize);
  } catch (error) {
    console.error("數據處理錯誤:", error);
    console.error("錯誤數據:", data);
    document.getElementById("plot").innerHTML =
      "數據處理失敗: " + error.message;
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
      Br: 35, Kr: 36, Rb: 37, Sr: 38, Y: 39, Zr: 40, Nb: 41, Mo: 42
    };

// 輔助函式：計算中位數
function median(arr) {
  const sorted = arr.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  } else {
    return sorted[mid];
  }
}

// 生成所有可能的鍵結組合，先對原子元素進行排序以確保命名一致
function getBondTypes(atoms) {
  // 將所有元素取出後排序，確保鍵結名稱為排序後的形式（例如 "5-22" 而非 "22-5"）
  const elements = [...new Set(atoms.map((atom) => atom.element))].sort();
  const bondTypes = [];

  // 生成所有可能的鍵結組合（僅生成一次對稱組合）
  for (let i = 0; i < elements.length; i++) {
    for (let j = i; j < elements.length; j++) {
      bondTypes.push({
        type: `${elements[i]}-${elements[j]}`,
        elements: [elements[i], elements[j]],
        minDistance: Infinity, // 初始值
        threshold: null, // 後續依據 minDistance 與因子計算
      });
    }
  }
  return bondTypes;
}

// 獲取特定原子對的鍵結類型名稱，排序後返回（與上面保持一致）
function getBondTypeName(element1, element2) {
  return [element1, element2].sort().join("-");
}

// 計算最小距離，這裡統一使用 3D 距離（z 軸也計算），但週期性偏移僅應用在 x 與 y 方向
function calculateMinDistances(atoms, cell, bondTypes) {
  const MAX_BOND_LENGTH = 3.0; // 只收集 4 Å 以內的距離
  const MIN_BOND_LENGTH = 1.0;

  // 建立一個物件記錄各鍵結類型的所有距離（以數值形式存放）
  const distanceRecords = {};
  bondTypes.forEach((bondType) => {
    distanceRecords[bondType.type] = [];
  });

  console.log("Initialized bondTypes:", bondTypes);
  console.log("Initialized distanceRecords:", distanceRecords);

  // 針對 x 與 y 方向做週期性補償（z 軸不做）
  const periodicOffsets = [
    { x: 0, y: 0 },
    // { x: cell[0][0], y: 0 },
    // { x: -cell[0][0], y: 0 },
    // { x: 0, y: cell[1][1] },
    // { x: 0, y: -cell[1][1] },
    // { x: cell[0][0], y: cell[1][1] },
    // { x: -cell[0][0], y: cell[1][1] },
    // { x: cell[0][0], y: -cell[1][1] },
    // { x: -cell[0][0], y: -cell[1][1] },
  ];

  // 遍歷所有原子對
  for (let i = 0; i < atoms.length; i++) {
    for (let j = i + 1; j < atoms.length; j++) {
      const atom1 = atoms[i];
      const atom2 = atoms[j];
      const bondTypeName = getBondTypeName(atom1.element, atom2.element);

      // 若未建立紀錄則發出警告（理論上不會發生）
      if (!distanceRecords[bondTypeName]) {
        console.warn(`Missing record array for bond type: ${bondTypeName}`);
        distanceRecords[bondTypeName] = [];
      }

      periodicOffsets.forEach((offset) => {
        const dx = atom1.x - atom2.x;
        const dy = atom1.y - atom2.y;
        const dz = atom1.z - atom2.z; // z 方向不補償
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

        // 只記錄在合理鍵結範圍內的距離
        if (distance >= MIN_BOND_LENGTH && distance <= MAX_BOND_LENGTH) {
          distanceRecords[bondTypeName].push(distance);
        }
      });
    }
  }

  // 依據收集到的距離計算穩健的鍵結距離（這裡以中位數作為代表）
  bondTypes.forEach((bt) => {
    const rec = distanceRecords[bt.type];
    if (rec.length > 0) {
      const med = median(rec);
      bt.minDistance = med;
    }
  });

  // 輸出每種鍵結類型的穩健鍵結距離與詳細紀錄（方便除錯）
  console.group("Bond Distance Analysis");
  console.log("Robust (median) distances for each bond type:");
  bondTypes.forEach((bt) => {
    console.log(
      `${bt.type}: ${
        bt.minDistance === Infinity ? "Infinity" : bt.minDistance.toFixed(3)
      } Å`
    );
  });
  console.groupEnd();

  return bondTypes;
}

// 創建鍵結
function createBonds(atoms, cell, bondTypes) {
  const bonds = [];
  const THRESHOLD_FACTOR = 1.2;

  // 為每種鍵結類型設定閾值
  bondTypes.forEach((bt) => {
    if (bt.minDistance !== Infinity) {
      bt.threshold = bt.minDistance * THRESHOLD_FACTOR;
    }
  });

  // 在擴展結構中，我們只需要考慮最基本的週期性偏移
  const periodicOffsets = [{ x: 0, y: 0 }];

  // 建立鍵結
  for (let i = 0; i < atoms.length; i++) {
    for (let j = i + 1; j < atoms.length; j++) {
      const atom1 = atoms[i];
      const atom2 = atoms[j];
      const bondTypeName = getBondTypeName(atom1.element, atom2.element);
      const btInfo = bondTypes.find((b) => b.type === bondTypeName);

      if (!btInfo || btInfo.minDistance === Infinity) continue;

      // 計算原子間距離
      const dx = atom1.x - atom2.x;
      const dy = atom1.y - atom2.y;
      const dz = atom1.z - atom2.z;
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (distance <= btInfo.threshold) {
        bonds.push({
          type: "scatter3d",
          mode: "lines",
          x: [atom1.x, atom2.x],
          y: [atom1.y, atom2.y],
          z: [atom1.z, atom2.z],
          line: {
            width: 6,
            color: "grey",
          },
          hoverinfo: "none",
        });
      }
    }
  }

  return bonds;
}
function createStructureVisualization(atoms, cell, periodicSize = "1x1") {
  // 處理週期性展開
  const [nx, ny] = periodicSize.split("x").map(Number);
  const expandedAtoms = [];

  // 根據週期性設置展開原子
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < ny; j++) {
      atoms.forEach((atom) => {
        expandedAtoms.push({
          x: atom.x + i * cell[0][0],
          y: atom.y + j * cell[1][1],
          z: atom.z,
          element: atom.element,
        });
      });
    }
  }

  // 準備視覺化數據
  let data = [];

  // 添加所有原子
  expandedAtoms.forEach((atom) => {
    const radius = getAtomRadius(atom.element) * 0.7;
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

  // 處理擴展後的晶格
  const expandedCell = [
    [cell[0][0] * nx, cell[0][1], cell[0][2]],
    [cell[1][0], cell[1][1] * ny, cell[1][2]],
    [cell[2][0], cell[2][1], cell[2][2]],
  ];

  // 使用擴展後的原子和晶格計算鍵結
  const bondTypes = getBondTypes(expandedAtoms);
  calculateMinDistances(expandedAtoms, expandedCell, bondTypes);
  const bondTraces = createBonds(expandedAtoms, expandedCell, bondTypes);
  data.push(...bondTraces);

  // 創建擴展的晶格框
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
      H: "#FFFFFF",He: "#D9FFFF",Li: "#CC80FF",Be: "#C2FF00",B: "#FFB5B5",C: "#909090",N: "#3050F8",O: "#FF0D0D",
      F: "#90E050",Ne: "#B3E3F5",Na: "#AB5CF2",Mg: "#8AFF00",Al: "#BFA6A6",Si: "#F0C8A0",P: "#FF8000",S: "#FFFF30",
      Cl: "#1FF01F",Ar: "#80D1E3",K: "#8F40D4",Ca: "#3DFF00",Sc: "#E6E6E6",Ti: "#BFC2C7",V: "#A6A6AB",
      Cr: "#8A99C7",Mn: "#9C7AC7",Fe: "#E06633",Co: "#F090A0",Ni: "#50D050",Cu: "#C88033",Zn: "#7D80B0",Ga: "#C28F8F",
      Ge: "#668F8F",As: "#BD80E3",Se: "#FFA100",Br: "#A62929",Kr: "#5CB8D1",Rb: "#702EB0",Sr: "#00FF00",Y: "#94FFFF",
      Zr: "#94E0E0",Nb: "#73C2C9",Mo: "#54B5B5",
    };
    return colors[element] || "#808080"; // 默認顏色為灰色
  }
//prettier-ignore
function getAtomRadius(element) {
    const radii = {
      H: 0.8, He: 0.8, Li: 0.8, Be: 0.8, B: 0.8, C: 0.8, N: 0.8, O: 0.8, F: 0.8, Ne: 0.8, Na: 0.8,
      Mg: 0.8, Al: 0.8, Si: 0.8, P: 0.8, S: 0.8, Cl: 0.8, Ar: 0.8, K: 0.8, Ca: 0.8, Sc: 0.8, Ti: 0.8,
      V: 0.8, Cr: 0.8, Mn: 0.8, Fe: 0.8, Co: 0.8, Ni: 0.8, Cu: 0.8, Zn: 0.8, Ga: 0.8, Ge: 0.8, As: 0.8,
      Se: 0.8, Br: 0.8, Kr: 0.8, Rb: 0.8, Sr: 0.8, Y: 0.8, Zr: 0.8, Nb: 0.8, Mo: 0.8, Tc: 0.8, Ru: 0.8,
      Rh: 0.8, Ag: 0.8, Sb: 0.8, Te: 0.8, I: 0.8, Xe: 0.8, Cs: 0.8, Ba: 0.8, La: 0.8, Ce: 0.8, Pr: 0.8,
      Nd: 0.8, Pm: 0.8, Sm: 0.8
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
