// Global variables
let allMaterials = [];
let filteredMaterials = [];
let currentPage = 1;
let itemsPerPage = 15;
let tempFilters = {
  species: "-",
  stoichiometry: "",
  magnetic: "-",
  dynamicStability: "-",
  energyMin: "",
  energyMax: "",
  bandgapMin: "",
  bandgapMax: "",
  // calcMethod: "gap",
};

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
  // 創建模態視窗的 HTML
  const modalHTML = `
      <div id="filterModal" class="modal-overlay">
          <div class="filter-modal">
              <div class="modal-header">
                  <h2>Filter Options</h2>
                  <button class="close-button">&times;</button>
              </div>
              <div class="select-group">
                  <div class="select-item">
                      <label for="species">Number of chemical species:</label>
                      <select id="numbers" class="numbers">
                          <option value="-">-</option>
                          <option value="1">1</option>
                          <option value="2">2</option>
                          <option value="3">3</option>
                          <option value="4">4</option>
                          <option value="5">5</option>
                          <option value="6">6</option>
                          <option value="7">7</option>
                          <option value="8">8</option>
                          <option value="9">9</option>
                      </select>
                  </div>
                  <div class="select-item">
                      <label for="search">Stoichiometry:</label>
                      <input type="search" id="stoich-search" data-stoich>
                  </div>
                  <div class="select-item">
                      <label for="magnetic">Magnetic:</label>
                      <select id="magstate" class="magnetic">
                          <option value="-">-</option>
                          <option value="FM">yes</option>
                          <option value="NM">no</option>
                      </select>
                  </div>
                  <div class="select-item">
                      <label for="dynamic">Dynamically stable:</label>
                      <select id="dyn_stab">
                          <option value="-">-</option>
                          <option value="Yes">yes</option>
                          <option value="No">no</option>
                          <option value="Unknown">unknown</option>
                      </select>
                  </div>
                  <div class="select-item">
                      <label for="energy">Energy above convex hull [eV/atom]:</label>
                      <div class="range-input">
                          <div class="range-input-a">
                              <input type="number" id="min-energy" name="min-energy" step="0.1" placeholder="0.0" class="short-input">
                              <span>-</span>
                              <input type="number" id="max-energy" name="max-energy" step="0.1" placeholder="4.0" class="short-input">
                          </div>
                      </div>
                  </div>
                  <div class="select-item">
                      <label for="energy">Band gap range [eV]:</label>
                      <div class="range-input">
                          <div class="range-input-b">
                              <input type="number" id="min-bandgap" step="0.1" step="0.1" placeholder="0.0" class="s-input">
                              <span>-</span>
                              <input type="number" id="max-bandgap" step="0.1"  step="0.1" placeholder="4.0"class="s-input">

                          </div>
                      </div>
                  </div>
                  <div class='button-group'>
                      <button id="clearButton">clear</button>
                      <button id="goButton">check</button>
                  </div>
              </div>
          </div>
      </div>
  `;
  //   <select id="calcmethod">
  //   <option value="gap">PBE</option>
  //   <option value="gap_hse">HSE</option>
  //   <option value="gap_gw">GW</option>
  // </select>
  // 將模態視窗加入到 body
  document.body.insertAdjacentHTML("beforeend", modalHTML);

  // 獲取必要的元素
  const filterButton = document.getElementById("filter");
  const modal = document.getElementById("filterModal");
  const closeButton = modal.querySelector(".close-button");
  const goButton = document.getElementById("goButton");
  const clearButton = document.getElementById("clearButton");

  // 打開模態視窗
  filterButton.addEventListener("click", function (e) {
    e.preventDefault();
    modal.style.display = "block";
  });

  // 關閉模態視窗的方法
  function closeModal() {
    modal.style.display = "none";
  }

  // 點擊關閉按鈕關閉模態視窗
  closeButton.addEventListener("click", closeModal);

  // 點擊模態視窗外部關閉模態視窗
  modal.addEventListener("click", function (e) {
    if (e.target === modal) {
      closeModal();
    }
  });

  // Check 按鈕點擊處理
  goButton.addEventListener("click", function () {
    // 收集所有篩選條件到暫存物件
    tempFilters = {
      species: document.getElementById("numbers").value,
      stoichiometry: document.getElementById("stoich-search").value,
      magnetic: document.getElementById("magstate").value,
      dynamicStability: document.getElementById("dyn_stab").value,
      energyMin: document.getElementById("min-energy").value,
      energyMax: document.getElementById("max-energy").value,
      bandgapMin: document.getElementById("min-bandgap").value,
      bandgapMax: document.getElementById("max-bandgap").value,
      // calcMethod: document.getElementById("calcmethod").value,
    };

    // 關閉模態視窗
    closeModal();
  });

  // Clear 按鈕點擊處理
  clearButton.addEventListener("click", function () {
    // 清空表單
    clearAllFilters();

    // 重置暫存的過濾條件
    tempFilters = {
      species: "-",
      stoichiometry: "",
      magnetic: "-",
      dynamicStability: "-",
      energyMin: "",
      energyMax: "",
      bandgapMin: "",
      bandgapMax: "",
      calcMethod: "gap",
    };
  });

  // Initial setup
  fetchMaterials();
  setupSearchHandlers();
  setupPaginationControls();
});

// Setup search handlers
function setupSearchHandlers() {
  const searchInput = document.querySelector(".search-input");
  const searchBtn = document.getElementById("search");

  // 添加輸入框的 keypress 事件處理
  searchInput.addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
      e.preventDefault(); // 防止表單提交
      // 直接執行搜尋
      const searchTerm = searchInput.value.toLowerCase();
      filterMaterialsWithCriteria(searchTerm, tempFilters);
    }
  });

  // 搜尋按鈕點擊事件
  searchBtn.addEventListener("click", (e) => {
    e.preventDefault();
    const searchTerm = searchInput.value.toLowerCase();
    filterMaterialsWithCriteria(searchTerm, tempFilters);
  });
}

// 設置pagination的控制
function setupPaginationControls() {
  document.getElementById("itemsPerPage").addEventListener("change", (e) => {
    itemsPerPage = parseInt(e.target.value);
    currentPage = 1;
    displayMaterials(filteredMaterials);
  });

  document.getElementById("previousPage").addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      displayMaterials(filteredMaterials);
    }
  });

  document.getElementById("nextPage").addEventListener("click", () => {
    const totalPages = Math.ceil(filteredMaterials.length / itemsPerPage);
    if (currentPage < totalPages) {
      currentPage++;
      displayMaterials(filteredMaterials);
    }
  });

  document.getElementById("gotoPage").addEventListener("change", (e) => {
    currentPage = parseInt(e.target.value);
    displayMaterials(filteredMaterials);
  });
}

// 清除所有的 filters
function clearAllFilters() {
  document.querySelector("[data-stoich]").value = "";
  document.getElementById("numbers").value = "-";
  document.getElementById("magstate").value = "-";
  document.getElementById("dyn_stab").value = "-";
  // document.getElementById("calcmethod").value = "gap"; //預設讓它顯示pbe的
  document.getElementById("min-energy").value = "";
  document.getElementById("max-energy").value = "";
  document.getElementById("min-bandgap").value = "";
  document.getElementById("max-bandgap").value = "";
}

// 去api抓材料
async function fetchMaterials() {
  try {
    const response = await fetch("/api/material");
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    allMaterials = await response.json();
    filteredMaterials = allMaterials;

    displayMaterials(filteredMaterials);
  } catch (error) {
    console.error("Fetch error:", error);
    displayError("Error fetching materials data: " + error.message);
  }
}

// 根據使用者所給的條件進行篩選
function filterMaterialsWithCriteria(searchTerm, filters) {
  filteredMaterials = allMaterials.filter((material) => {
    const formula = material.olduid.split("-")[0].toLowerCase();
    const stoich = material.folder.split("/")[6];

    if (searchTerm && !formula.includes(searchTerm)) {
      return false;
    }

    if (filters.species !== "-") {
      // const speciesCount = formula.match(/[A-Z]/g)?.length || 0;
      const speciesCount = stoich.length;
      if (parseInt(filters.species) !== speciesCount) {
        return false;
      }
    }

    if (filters.stoichiometry) {
      if (filters.stoichiometry !== stoich) {
        return false;
      }
    }

    if (filters.magnetic !== "-") {
      if (material.magstate !== filters.magnetic) {
        return false;
      }
    }

    if (filters.dynamicStability !== "-") {
      if (material.dyn_stab !== filters.dynamicStability) {
        return false;
      }
    }

    if (filters.energyMin !== "") {
      if (material.ehull < parseFloat(filters.energyMin)) {
        return false;
      }
    }
    if (filters.energyMax !== "") {
      if (material.ehull > parseFloat(filters.energyMax)) {
        return false;
      }
    }

    // const bandgap =
    //   filters.calcMethod === "gap"
    //     ? material.gap
    //     : filters.calcMethod === "gap_hse"
    //     ? material.gap_hse
    //     : material.gap_gw;

    // let bandgap;
    // if (filters.calcMethod === "gap") {
    //   bandgap = material.gap;
    // } else if (filters.calcMethod === "gap_hse") {
    //   bandgap = material.gap_hse;
    // } else {
    //   bandgap = material.gap_gw;
    // }

    if (filters.bandgapMin !== "") {
      if (
        material.gap < parseFloat(filters.bandgapMin) ||
        material.gap == null //這裡important，gap如果沒有的話網頁也會顯示，所以要寫這行
      ) {
        return false;
      }
    }
    if (filters.bandgapMax !== "") {
      if (
        material.gap > parseFloat(filters.bandgapMax) ||
        material.gap == null
      ) {
        return false;
      }
    }

    return true;
  });

  currentPage = 1;
  displayMaterials(filteredMaterials);
  updatePaginationControls(Math.ceil(filteredMaterials.length / itemsPerPage));
}

// Display materials in table
function displayMaterials(materials) {
  const materialList = document.getElementById("MaterialList");
  if (!materialList) return;

  materialList.innerHTML = "";

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const pageItems = materials.slice(startIndex, endIndex);

  if (pageItems.length === 0) {
    materialList.innerHTML = '<tr><td colspan="6">No materials found</td></tr>';
    return;
  }

  pageItems.forEach((material) => {
    const row = document.createElement("tr");
    const formula = convertToSubscript(
      material.folder.split("/").pop().split("-")[0]
    );

    row.innerHTML = `
            <td>${formula}</td>
            <td>${material.ehull ? material.ehull.toFixed(3) : "-"}</td>
            <td>${material.hform ? material.hform.toFixed(3) : "-"}</td>
            <td>${
              material.gap !== undefined ? material.gap.toFixed(3) : "-"
            }</td>
            <td>${material.magstate || "-"}</td>
            <td>${material.layergroup || "-"}</td>
        `;

    row.onclick = () => loadPage(formula);
    materialList.appendChild(row);
  });

  updatePaginationControls(Math.ceil(materials.length / itemsPerPage));
}

// Update pagination controls
function updatePaginationControls(totalPages) {
  const gotoPageSelect = document.getElementById("gotoPage");
  gotoPageSelect.innerHTML = "";

  for (let i = 1; i <= totalPages; i++) {
    const option = document.createElement("option");
    option.value = i;
    option.textContent = `Page ${i}`;
    if (i === currentPage) option.selected = true;
    gotoPageSelect.appendChild(option);
  }

  const prevButton = document.getElementById("previousPage");
  const nextButton = document.getElementById("nextPage");

  prevButton.disabled = currentPage === 1;
  nextButton.disabled = currentPage === totalPages;

  prevButton.classList.toggle("disabled", prevButton.disabled);
  nextButton.classList.toggle("disabled", nextButton.disabled);

  const startRow = (currentPage - 1) * itemsPerPage + 1;
  const endRow = Math.min(filteredMaterials.length, currentPage * itemsPerPage);
  const totalItems = filteredMaterials.length;
}

// Load detail page for selected material
function loadPage(materialName) {
  const material = allMaterials.find(
    (m) =>
      convertToSubscript(m.folder.split("/").pop().split("-")[0]) ===
      materialName
  );

  const params = new URLSearchParams({
    name: materialName,
    data: encodeURIComponent(JSON.stringify(material)),
  });

  window.open(`newPage.html?${params.toString()}`, "_self");
  //改成'blank'就是新分頁，'self'就是原分頁開啟
}

// Convert numbers to subscript in chemical formulas
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

  return text.replace(/(\d+)/g, (match) =>
    match
      .split("")
      .map((digit) => subscriptMap[digit] || digit)
      .join("")
  );
}

// Display error message
function displayError(message) {
  const materialList = document.getElementById("MaterialList");
  if (materialList) {
    materialList.innerHTML = `<tr><td colspan="6">${message}</td></tr>`;
  }
}

// 確保模態視窗在其他 JavaScript 載入後初始化
document.addEventListener("DOMContentLoaded", function () {
  // 這裡的程式碼會在所有 HTML 元素完全載入後執行
  const filterButton = document.getElementById("filter");
  if (filterButton) {
    filterButton.addEventListener("click", function (e) {
      e.preventDefault();
      const modal = document.getElementById("filterModal");
      if (modal) {
        modal.style.display = "block";
      }
    });
  }
});
