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
  const directionPanel = document.querySelector(".direction");
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
      directionPanel.classList.add("show");
      //用toggle的話就是一直切換
      if (action === "Hide") {
        // 隱藏視覺化
        directionPanel.classList.remove("show");
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

  //確認一下有沒有確實抓到按鈕的動向
  const cameraDirection = document.querySelector(".direction");
  cameraDirection.addEventListener("click", (e) => {
    if (e.target.tagName === "BUTTON") {
      console.log(e.target.id);
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

// 初始化場景、相機和渲染器
const scene = new THREE.Scene(); // Main scene
const threeContainer = document.getElementById("plot");
const containerWidth = threeContainer.clientWidth;
const containerHeight = threeContainer.clientHeight;
const aspect = containerWidth / containerHeight; // 計算寬高比
const viewHeight = 10;
const viewWidth = viewHeight * aspect;
const camera = new THREE.OrthographicCamera(
  -viewWidth / 2, // left
  viewWidth / 2, // right
  viewHeight / 2, // top
  -viewHeight / 2, // bottom
  0.1, // near (近裁面)
  1000 // far (遠裁面)
);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.physicallyCorrectLights = true;
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

// 設置渲染器大小為容器大小而非窗口大小
renderer.setSize(containerWidth, containerHeight);
renderer.setClearColor(0x2a2d35);

// 將渲染器的 DOM 元素添加到指定的容器
threeContainer.appendChild(renderer.domElement);

// 根據容器大小設定渲染器和相機
const updateRendererSize = () => {
  const width = threeContainer.clientWidth;
  const height = threeContainer.clientHeight;
  renderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
};

// 第一次設定大小
updateRendererSize();

// 添加光源

// 增加環境光
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

// 增加方向光，模擬太陽光
const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight1.position.set(1, 1, 1).normalize();
scene.add(directionalLight1);

const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight2.position.set(-1, -1, -1).normalize();
scene.add(directionalLight2);

// const directionalLight3 = new THREE.DirectionalLight(0xffffff, 0.8);
// directionalLight3.position.set(-1, -1, 1).normalize();
// scene.add(directionalLight3);

// 添加點光源，增強特定區域照明
const pointLight = new THREE.PointLight(0xffffff, 0.5);
pointLight.position.set(5, 5, 5);
scene.add(pointLight);

// 使用 OrbitControls
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.update(); // 初始化控制項
controls.enableDamping = true; //阻尼的感覺
controls.dampingFacttor = 0.05; //係數調一下
controls.rotateSpeed = 0.3;

// 創建分子模型組 (所有原子和鍵結都放在這個組裡面)
const moleculeGroup = new THREE.Group();
scene.add(moleculeGroup); // 將組添加到主場景中

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
    console.error("failed to load:", error);
    document.getElementById("plot").innerHTML = "failed to load";
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

function createStructureVisualization(atoms, cell, periodicSize = "1x1") {
  while (moleculeGroup.children.length > 0) {
    const child = moleculeGroup.children[0];
    moleculeGroup.remove(child);
    if (child.geometry) child.geometry.dispose();
    if (child.material) child.geometry.dispose();
  }
  // 處理週期性展開
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
  console.log(expandedAtoms);
  expandedAtoms.forEach((atom) => {
    const skinColor = getAtomColor(atom.element);
    const sphereMaterial = new THREE.MeshPhongMaterial({
      color: skinColor,
      // metalness: 0.1, // 金屬感低，維持非金屬特性
      // roughness: 0.4, // 略光滑但不鏡面
      // clearcoat: 0.8, // 有清漆層產生柔亮高光
      // clearcoatRoughness: 0.1, // 清漆層光滑
      // reflectivity: 0.5, // 半反射
      // transmission: 0.0, // 如果不透明就設為 0
      // thickness: 1.0, // 厚度，若 transmission > 0 才會有效
    });

    const modifiedRadius = getAtomRadius(atom.element) * 0.005;
    const sphereGeometry = new THREE.SphereGeometry(modifiedRadius, 64, 64);
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphere.userData.element = atom.element;
    sphere.position.set(atom.x, atom.y, atom.z);
    moleculeGroup.add(sphere);
  });
  //呼叫getBondTypes把鍵結算出來
  const bondInfo = getBondTypes(expandedAtoms);
  const expandedBonds = bondInfo.bonds;
  console.log(bondInfo);

  //呼叫createBonds把鍵結做出來
  createBonds(expandedAtoms, cell, bondInfo);
  //呼叫createLatticebox把晶格框架做出來
  createLatticeBox(cell, nx, ny);
  // 按鈕事件監聽器，處理相機視角
  const cameraDirection = document.querySelector(".direction");
  cameraDirection.addEventListener("click", (e) => {
    if (e.target.tagName === "BUTTON") {
      const buttonId = e.target.id;
      console.log(buttonId);

      // 解析按鈕ID來確定軸向和方向
      let axis, isReverse;

      if (buttonId.endsWith("*")) {
        // 處理 a*, b*, c* 按鈕
        axis = buttonId.charAt(0); // 取得第一個字符 (a, b, 或 c)
        isReverse = true;
      } else {
        // 處理 a, b, c 按鈕
        axis = buttonId;
        isReverse = false;
      }
      // 呼叫相機調整函數
      setCameraViewAlongAxis(axis, isReverse);
    }
  });
}

// 封裝相機調整函數
function setCameraViewAlongAxis(axis, isReverse = false) {
  const boundingBox = new THREE.Box3().setFromObject(moleculeGroup);
  const center = new THREE.Vector3();
  const size = new THREE.Vector3();

  boundingBox.getCenter(center);
  boundingBox.getSize(size);

  console.log("center:", center.toArray());

  // 根據結構大小計算合適的相機距離
  const maxDim = Math.max(size.x, size.y, size.z);
  const cameraDistance = maxDim * 10; // 可以調整這個倍數

  // 定義各軸向的相機位置偏移
  let offsetFromCenter;

  switch (axis) {
    case "a":
      // 沿著 X 軸觀看 (從右側或左側看)
      offsetFromCenter = new THREE.Vector3(
        isReverse ? -cameraDistance : cameraDistance,
        0,
        0
      );
      break;
    case "b":
      // 沿著 Y 軸觀看 (從上方或下方看)
      offsetFromCenter = new THREE.Vector3(
        0,
        isReverse ? -cameraDistance : cameraDistance,
        0
      );
      break;
    case "c":
      // 沿著 Z 軸觀看 (從前方或後方看)
      offsetFromCenter = new THREE.Vector3(
        0,
        0,
        isReverse ? -cameraDistance : cameraDistance
      );
      break;
    default:
      console.warn("未知的軸向:", axis);
      return;
  }

  // 設定相機位置和目標
  camera.position.copy(center).add(offsetFromCenter);
  camera.lookAt(center);
  camera.updateProjectionMatrix();

  // 更新 OrbitControls
  controls.target.copy(center);
  controls.update();
}

// 2. 建立 Raycaster + mouse
const raycaster = new THREE.Raycaster();
raycaster.params.Mesh.threshold = 0;
raycaster.params.Line.threshold = 0.05; //縮小線段的使用範圍，避免一直被他擋住
const mouse = new THREE.Vector2();

// 3. 建立 tooltip DOM 元素
const tooltip = document.createElement("div");
tooltip.style.position = "absolute";
tooltip.style.padding = "4px 8px";
tooltip.style.background = "rgba(0,0,0,0.7)";
tooltip.style.color = "white";
tooltip.style.borderRadius = "4px";
tooltip.style.pointerEvents = "none";
tooltip.style.display = "none";
document.body.appendChild(tooltip);

// 4. 監聽滑鼠事件
// 修正滑鼠事件監聽器
window.addEventListener("mousemove", (event) => {
  // 獲取容器的邊界框
  const rect = threeContainer.getBoundingClientRect();

  // 計算相對於容器的滑鼠位置
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  // 直接檢查與moleculeGroup子物體的交集
  const intersects = raycaster.intersectObjects(moleculeGroup.children);

  if (intersects.length > 0) {
    const obj = intersects[0].object;
    if (obj.userData.element) {
      tooltip.textContent = obj.userData.element;
      tooltip.style.left = event.clientX + 10 + "px";
      tooltip.style.top = event.clientY + 10 + "px";
      tooltip.style.display = "block";
      // obj.material.color.set(0xff0000);
    }
  } else {
    tooltip.style.display = "none";
  }
});

// 建立渲染迴圈
function animate() {
  requestAnimationFrame(animate); // 要求瀏覽器在下一個動畫影格呼叫 animate 函數

  controls.update(); // 如果使用了 controls (如 OrbitControls)，需要更新它

  renderer.render(scene, camera); // 呼叫渲染器來繪製場景和相機所見到的畫面
}

// 啟動渲染迴圈
animate();

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
  // console.log(`${bonds.length} bonds were detected`);

  // 修改返回對象，包含 minimumDistances
  return { bonds, bondTypes: ["bond"], minimumDistances };
}

function createBonds(expandedAtoms, cell, bondInfo) {
  // 鍵結的粗細 (半徑)
  const bondRadius = 0.1; // 調整為更合適的尺寸
  const { bonds } = bondInfo;

  // 檢查 bonds 是否存在且為數組
  if (!bonds || !Array.isArray(bonds) || bonds.length === 0) {
    console.warn("沒有鍵結可繪製或鍵結數據格式錯誤");
    return;
  }

  // 遍歷需要繪製的鍵結列表
  bonds.forEach((bond) => {
    // 確保 bond 對象及其屬性存在
    if (!bond || !bond.from || !bond.to) {
      console.warn("require necessary bonding properties", bond);
      return;
    }

    // 從鍵結物件中取出 from 和 to 的位置信息
    const atom1Pos = new THREE.Vector3(bond.from.x, bond.from.y, bond.from.z);
    const atom2Pos = new THREE.Vector3(bond.to.x, bond.to.y, bond.to.z);

    // 計算兩個原子中心之間的總距離
    const totalDistance = atom1Pos.distanceTo(atom2Pos);

    // 如果距離過小，不繪製
    if (totalDistance < 0.01) {
      console.log("Atoms too close", totalDistance);
      return;
    }

    // 獲取兩端原子的實際繪製半徑
    const radiusA = getAtomRadius(bond.from.element) * 0.005; // 與創建原子球體時使用相同的縮放
    const radiusB = getAtomRadius(bond.to.element) * 0.005;

    // 計算從 atom1Pos 到 atom2Pos 的方向向量
    const direction = new THREE.Vector3()
      .subVectors(atom2Pos, atom1Pos)
      .normalize();

    // 計算原子表面上的點
    const surfacePointA = new THREE.Vector3()
      .copy(atom1Pos)
      .addScaledVector(direction, radiusA);
    const surfacePointB = new THREE.Vector3()
      .copy(atom2Pos)
      .addScaledVector(direction.clone().negate(), radiusB);

    // 計算表面點之間的距離
    const surfaceDistance = surfacePointA.distanceTo(surfacePointB);

    // 如果表面點之間的距離太小，不繪製
    if (surfaceDistance < 0.001) {
      console.log("原子表面太近，跳過繪製鍵結:", surfaceDistance);
      return;
    }

    // 計算表面點之間的中點
    const midPoint = new THREE.Vector3()
      .addVectors(surfacePointA, surfacePointB)
      .multiplyScalar(0.5);

    // 獲取兩端原子的顏色
    const colorA = getAtomColor(bond.from.element);
    const colorB = getAtomColor(bond.to.element);

    // 計算每一段鍵結的長度(從表面到中點)
    const halfLength = surfaceDistance / 2;
    const atom1ToMidpoint = atom1Pos.distanceTo(midPoint);
    const atom2ToMidpoint = atom2Pos.distanceTo(midPoint);
    // 創建兩個圓柱體的幾何體
    const cylinderGeometry1 = new THREE.CylinderGeometry(
      bondRadius,
      bondRadius,
      atom1ToMidpoint,
      32, // 增加分段數使圓柱體更光滑
      3
    );

    const cylinderGeometry2 = new THREE.CylinderGeometry(
      bondRadius,
      bondRadius,
      atom2ToMidpoint,
      32, // 增加分段數使圓柱體更光滑
      3
    );

    // 創建兩個不同顏色的材質
    const materialA = new THREE.MeshPhysicalMaterial({
      color: colorA,
      metalness: 0.1,
      roughness: 0.4,
      clearcoat: 0.5,
      clearcoatRoughness: 0.2,
    });
    const materialB = new THREE.MeshPhysicalMaterial({
      color: colorB,
      metalness: 0.1,
      roughness: 0.4,
      clearcoat: 0.5,
      clearcoatRoughness: 0.2,
    });

    // 創建第一段圓柱體(從atom1表面到中點)
    const cylinder1 = new THREE.Mesh(cylinderGeometry1, materialA);
    // 移動使底部對齊atom1表面，頂部對齊中點
    cylinder1.position.copy(
      new THREE.Vector3().addVectors(atom1Pos, midPoint).multiplyScalar(0.5)
    );
    // 旋轉圓柱體使其對齊鍵結方向
    cylinder1.lookAt(atom2Pos);
    cylinder1.rotateX(Math.PI / 2); // 旋轉90度使圓柱體軸對齊方向

    // 創建第二段圓柱體(從中點到atom2表面)
    const cylinder2 = new THREE.Mesh(cylinderGeometry2, materialB);
    // 移動使底部對齊中點，頂部對齊atom2表面
    cylinder2.position.copy(
      new THREE.Vector3().addVectors(midPoint, atom2Pos).multiplyScalar(0.5)
    );
    // 旋轉圓柱體使其對齊鍵結方向
    cylinder2.lookAt(atom2Pos);
    cylinder2.rotateX(Math.PI / 2); // 旋轉90度使圓柱體軸對齊方向

    // 將兩個圓柱體添加到分子組
    moleculeGroup.add(cylinder1);
    moleculeGroup.add(cylinder2);

    // 可以添加調試用的點來顯示表面點和中點
    /*
    const pointGeometry = new THREE.SphereGeometry(bondRadius * 1.5, 8, 8);
    const pointMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    const surfacePoint1 = new THREE.Mesh(pointGeometry, pointMaterial);
    surfacePoint1.position.copy(surfacePointA);
    const surfacePoint2 = new THREE.Mesh(pointGeometry, pointMaterial);
    surfacePoint2.position.copy(surfacePointB);
    const midPointMesh = new THREE.Mesh(pointGeometry, new THREE.MeshBasicMaterial({ color: 0x00ffff }));
    midPointMesh.position.copy(midPoint);
    moleculeGroup.add(surfacePoint1);
    moleculeGroup.add(surfacePoint2);
    moleculeGroup.add(midPointMesh);
    */
  });
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
//prettier-ignore
function createLatticeBox(cell,nx,ny) {
  //消除之前的晶格框，消除記憶體
  moleculeGroup.children.forEach(child => {
      if(child.userData && child.userData.isLatticeBox) {
          moleculeGroup.remove(child);
          if(child.geometry) child.geometry.dispose();
          if(child.material) child.material.dispose();
      }
  });  

  const boxVecA = new THREE.Vector3().fromArray(cell[0]);
  const boxVecB = new THREE.Vector3().fromArray(cell[1]);
  const boxVecC = new THREE.Vector3().fromArray(cell[2]);

  //設定材質 (基本邊的)
  const defaultLineMaterial = new THREE.LineBasicMaterial({
    color: 0x00ffff,
    linewidth: 1,
  });

  //設定材質 (a,b,c的)
  const lineMaterialA = new THREE.LineBasicMaterial({color:0xff0000,linewidth:1})
  const lineMaterialB = new THREE.LineBasicMaterial({color:0x00ff00,linewidth:1})
  const lineMaterialC = new THREE.LineBasicMaterial({color:0x0000ff,linewidth:1})

  //定義abc軸
  const baseVectors = [
    { start: new THREE.Vector3(0, 0, 0), end: boxVecA.clone(), material: lineMaterialA },
    { start: new THREE.Vector3(0, 0, 0), end: boxVecB.clone(), material: lineMaterialB },
    { start: new THREE.Vector3(0, 0, 0), end: boxVecC.clone(), material: lineMaterialC }
  ]

  const remainingEdges = [
      // 底部剩餘的邊
      [boxVecA.clone(), boxVecA.clone().add(boxVecB)],
      [boxVecB.clone(), boxVecA.clone().add(boxVecB)],
      // 頂部四邊
      [boxVecC.clone(), boxVecC.clone().add(boxVecA)],
      [boxVecC.clone(), boxVecC.clone().add(boxVecB)],
      [boxVecC.clone().add(boxVecA), boxVecC.clone().add(boxVecA).add(boxVecB)],
      [boxVecC.clone().add(boxVecB), boxVecC.clone().add(boxVecA).add(boxVecB)],
      // 連接底部和頂部的其餘邊
      [boxVecA.clone(), boxVecA.clone().add(boxVecC)],
      [boxVecB.clone(), boxVecB.clone().add(boxVecC)],
      [boxVecA.clone().add(boxVecB), boxVecA.clone().add(boxVecB).add(boxVecC)]
  ];

  //開始繪製 abc
  baseVectors.forEach(({start, end, material}) => {
      const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
      const line = new THREE.Line(geometry, material);
      line.userData = { isLatticeBox: true };
      moleculeGroup.add(line);
  });
  
  // 繪製其餘的邊 
  remainingEdges.forEach(([start, end]) => {
      const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
      const line = new THREE.Line(geometry, defaultLineMaterial);
      line.userData = { isLatticeBox: true };
      moleculeGroup.add(line);
  });


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
