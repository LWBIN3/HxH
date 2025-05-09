// const { json } = require("express");
const { kdTree } = require("kd-tree-javascript");
document.addEventListener("DOMContentLoaded", () => {
  // 獲取 URL 參數
  const urlParams = new URLSearchParams(window.location.search);
  const materialName = urlParams.get("name");
  const materialData = JSON.parse(decodeURIComponent(urlParams.get("data")));

  // 更新頁面標題
  document.title = `${materialName} - Details`;

  // 更新材料名稱
  const materialNameElement = document.getElementById("materialName");
  materialNameElement.textContent = `Overview: ${
    materialName || "Unknown Material"
  }`;

  // 填充材料數據
  if (materialData) {
    document.getElementById("layerGroupInfo").textContent =
      materialData.layergroup || "-";
    document.getElementById("layerGroupNumber").textContent =
      materialData.lgnum || "-";
    document.getElementById("structureOrigin").textContent =
      materialData.label || "-";
    document.getElementById("energyConvexHull").textContent = materialData.ehull
      ? materialData.ehull.toFixed(3)
      : "-";
    document.getElementById("heatFormation").textContent = materialData.hform
      ? materialData.hform.toFixed(3)
      : "-";
    document.getElementById("dynStable").textContent =
      materialData.dyn_stab || "-";
    document.getElementById("Magnetic").textContent =
      materialData.magstate || "-";
    document.getElementById("bandgapPBE").textContent = materialData.gap
      ? materialData.gap.toFixed(3)
      : "-";
    const element = materialName;
    const materialList = parseChemicalFormula(element);

    initCheck(materialName, materialList);
  }
});

document.querySelectorAll(".accordion").forEach((accordion) => {
  accordion.addEventListener("click", () => {
    accordion.classList.toggle("active");
    // 找到當前手風琴按鈕的下一個兄弟元素，又兄弟又姊妹的
    const insideContent = accordion.nextElementSibling;
    const myPlot = insideContent
      ? insideContent.querySelector("#myPlot")
      : null;

    if (insideContent) {
      if (insideContent.style.maxHeight) {
        // 如果已展開，則摺疊
        insideContent.style.maxHeight = null;
        insideContent.style.padding = "0 18px"; // 清除 padding

        if (myPlot) {
          myPlot.style.maxHeight = null;
        }
      } else {
        // 如果摺疊，則展開
        insideContent.style.maxHeight = insideContent.scrollHeight + "px";
        insideContent.style.padding = "18px"; // 恢復 padding

        if (myPlot) {
          myPlot.style.maxHeight = myPlot.scrollHeight + "px";
        }
      }
    }
  });
});
////fuck it all
function convertToSubscript(text) {
  const subscriptMap = {
    0: "₀",
    1: "₁",
    2: "₂",
    3: "₃",
    4: "₄",
    5: "₅",
    6: "₆",
    7: "₇",
    8: "₈",
    9: "₉",
  };

  return text.replace(/(\d+)/g, (match) => {
    return match
      .split("")
      .map((digit) => subscriptMap[digit] || digit)
      .join("");
  });
}

//plotly start from here
//先去api抓資料(caution!資料型態有改過)
async function initCheck(materialName, materialList) {
  const atomicNumbers = materialList.map((element) => elementMap[element]);

  try {
    const response = await fetch("http://localhost:3000/api/infovisualize");
    const apiData = await response.json();

    let matchedData = null;
    for (const item of apiData) {
      if (item["1"] && item["1"].numbers && Array.isArray(item["1"].numbers)) {
        const entryNumbers = item["1"].numbers;
        // 檢查長度是否相同
        if (entryNumbers.length === atomicNumbers.length) {
          // 建立兩個陣列的元素計數
          const countMap1 = {};
          const countMap2 = {};

          // 計算兩個陣列中各元素的出現次數
          entryNumbers.forEach((num) => {
            countMap1[num] = (countMap1[num] || 0) + 1;
          });

          atomicNumbers.forEach((num) => {
            countMap2[num] = (countMap2[num] || 0) + 1;
          });

          // 比較兩個計數對象是否相同
          const isMatch =
            Object.keys(countMap1).length === Object.keys(countMap2).length &&
            Object.keys(countMap1).every(
              (key) => countMap1[key] === countMap2[key]
            );

          if (isMatch) {
            matchedData = item["1"];
            break;
          }
        }
      }
    }

    if (matchedData) {
      initStructure(matchedData);
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

function initStructure(data) {
  // cell 數據現在直接是二維陣列
  const cell = data.cell;

  // positions 現在是二維陣列，每個元素包含 [x, y, z]
  const positions = data.positions;
  const numbers = data.numbers;

  const atoms = positions.map((position, index) => ({
    x: position[0],
    y: position[1],
    z: position[2],
    element: getElementSymbol(numbers[index]),
  }));

  createStructureVisualization(atoms, cell);
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
  Re: 75, Os: 76, Ir: 77, Pt: 78, Au: 79, Hg: 80, Tl: 81, Pb: 82
};
function createStructureVisualization(atoms, cell) {
  let data = [];

  atoms.forEach((atom) => {
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

  const latticeBox = createLatticeBox(cell);
  data.push(latticeBox);

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
    },
    margin: { l: 0, r: 0, b: 0, t: 0 },
    showlegend: false,
    autosize: true,
    width: "80%",
    height: "100%",
  };

  Plotly.newPlot("myPlot", data, layout, {
    responsive: true,
  });
}

function generateSpherePoints(centerX, centerY, centerZ, radius) {
  const points = { x: [], y: [], z: [] };
  const segments = 20;
  const golden_ratio = (1 + Math.sqrt(5)) / 2;
  const angle_increment = Math.PI * 2 * golden_ratio;

  // 使用斐波那契球面分佈來生成點
  for (let i = 0; i < segments * segments; i++) {
    const t = i / (segments * segments - 1);
    const inclination = Math.acos(1 - 2 * t);
    const azimuth = angle_increment * i;

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

  const edges = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 0],
    [4, 5],
    [5, 6],
    [6, 7],
    [7, 4],
    [0, 4],
    [1, 5],
    [2, 6],
    [3, 7],
  ];

  return {
    type: "scatter3d",
    mode: "lines",
    x: edges.flatMap(([i, j]) => [vertices[i][0], vertices[j][0], null]),
    y: edges.flatMap(([i, j]) => [vertices[i][1], vertices[j][1], null]),
    z: edges.flatMap(([i, j]) => [vertices[i][2], vertices[j][2], null]),
    line: {
      width: 2,
      color: "black",
    },
    hoverinfo: "none",
  };
}

function getAtomColor(element) {
  const colors = {
    H: "#FFFFFF",
    He: "#D9FFFF",
    Li: "#CC80FF",
    Be: "#C2FF00",
    B: "#FFB5B5",
    C: "#909090",
    N: "#3050F8",
    O: "#FF0D0D",
    F: "#90E050",
    Ne: "#B3E3F5",
    Na: "#AB5CF2",
    Mg: "#8AFF00",
    Al: "#BFA6A6",
    Si: "#F0C8A0",
    P: "#FF8000",
    S: "#FFFF30",
    Cl: "#1FF01F",
    Ar: "#80D1E3",
    K: "#8F40D4",
    Ca: "#3DFF00",
    Sc: "#E6E6E6",
    Ti: "#BFC2C7",
    V: "#A6A6AB",
    Cr: "#8A99C7",
    Mn: "#9C7AC7",
    Fe: "#E06633",
    Co: "#F090A0",
    Ni: "#50D050",
    Cu: "#C88033",
    Zn: "#7D80B0",
    Ga: "#C28F8F",
    Ge: "#668F8F",
    As: "#BD80E3",
    Se: "#FFA100",
    Br: "#A62929",
    Kr: "#5CB8D1",
    Rb: "#702EB0",
    Sr: "#00FF00",
    Y: "#94FFFF",
    Zr: "#94E0E0",
    Nb: "#73C2C9",
    Mo: "#54B5B5",
    Tc: "#3B9E9E",
    Ru: "#248F8F",
    Rh: "#0A7D8C",
    Pd: "#006985",
    Ag: "#C0C0C0",
    Cd: "#FFD98F",
    In: "#A67573",
    Sn: "#668080",
    Sb: "#9E63B5",
    Te: "#D47A00",
    I: "#940094",
    Xe: "#429EB0",
    Cs: "#57178F",
    Ba: "#00C900",
    La: "#70D4FF",
    Ce: "#FFFFC7",
    Pr: "#D9FFC7",
    Nd: "#C7FFC7",
    Pm: "#A3FFC7",
    Sm: "#8FFFC7",
    Eu: "#61FFC7",
    Gd: "#45FFC7",
    Tb: "#30FFC7",
    Dy: "#1FFFC7",
    Ho: "#00FF9C",
    Er: "#00E675",
    Tm: "#00D452",
    Yb: "#00BF38",
    Lu: "#00AB24",
    Hf: "#4DC2FF",
    Ta: "#4DA6FF",
    W: "#2194D6",
    Re: "#267DAB",
    Os: "#266696",
    Ir: "#175487",
    Pt: "#D0D0E0",
    Au: "#FFD123",
    Hg: "#B8B8D0",
    Tl: "#A6544D",
    Pb: "#575961",
  };
  return colors[element] || "#808080"; // 默認顏色為灰色
}

function getAtomRadius(element) {
  const radii = {
    H: 0.3, // Hydrogen
    He: 0.4, // Helium
    Li: 0.7, // Lithium
    Be: 0.6, // Beryllium
    B: 0.5, // Boron
    C: 0.4, // Carbon
    N: 0.4, // Nitrogen
    O: 0.4, // Oxygen
    F: 0.4, // Fluorine
    Ne: 0.4, // Neon
    Na: 1.0, // Sodium
    Mg: 1.2, // Magnesium
    Al: 1.2, // Aluminum
    Si: 1.1, // Silicon
    P: 1.0, // Phosphorus
    S: 1.0, // Sulfur
    Cl: 1.0, // Chlorine
    Ar: 1.0, // Argon
    K: 1.5, // Potassium
    Ca: 1.3, // Calcium
    Sc: 1.4, // Scandium
    Ti: 1.4, // Titanium
    V: 1.3, // Vanadium
    Cr: 1.3, // Chromium
    Mn: 1.3, // Manganese
    Fe: 1.3, // Iron
    Co: 1.3, // Cobalt
    Ni: 1.2, // Nickel
    Cu: 1.2, // Copper
    Zn: 1.2, // Zinc
    Ga: 1.2, // Gallium
    Ge: 1.2, // Germanium
    As: 1.2, // Arsenic
    Se: 1.2, // Selenium
    Br: 1.2, // Bromine
    Kr: 1.2, // Krypton
    Rb: 1.6, // Rubidium
    Sr: 1.5, // Strontium
    Y: 1.4, // Yttrium
    Zr: 1.4, // Zirconium
    Nb: 1.4, // Niobium
    Mo: 1.4, // Molybdenum
    Tc: 1.3, // Technetium
    Ru: 1.3, // Ruthenium
    Rh: 1.3, // Rhodium
    Pd: 1.3, // Palladium
    Ag: 1.3, // Silver
    Cd: 1.4, // Cadmium
    In: 1.4, // Indium
    Sn: 1.4, // Tin
    Sb: 1.4, // Antimony
    Te: 1.4, // Tellurium
    I: 1.4, // Iodine
    Xe: 1.4, // Xenon
    Cs: 1.7, // Cesium
    Ba: 1.5, // Barium
    La: 1.6, // Lanthanum
    Ce: 1.6, // Cerium
    Pr: 1.6, // Praseodymium
    Nd: 1.6, // Neodymium
  };
  return radii[element] || 0.5; // 挖A default radius
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
