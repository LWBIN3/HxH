// Global variables
let allMaterials = [];
let filteredMaterials = [];
let currentPage = 1;
let itemsPerPage = 15;
let tempFilters = {
  crystalSystem: "-",
  crystalPlane: "",
  polarity: "-",
  energyMin: "",
  energyMax: "",
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
                      <label for="crystal-system">Crystal System:</label>
                      <select id="crystal-system" class="filter-select">
                          <option value="-">-</option>
                          <option value="triclinic">Triclinic</option>
                          <option value="monoclinic">Monoclinic</option>
                          <option value="orthorhombic">Orthorhombic</option>
                          <option value="tetragonal">Tetragonal</option>
                          <option value="hexagonal">Hexagonal</option>
                          <option value="cubic">Cubic</option>
                      </select>
                  </div>
                  <div class="select-item">
                      <label for="crystal-plane-search">Crystal Plane</label>
                      <input type="search" id="crystal-plane-search" class="filter-input" data-crystal-plane>
                  </div>

                  <div class="select-item">
                      <label for="polarity-select">Polarity</label>
                      <select id="polarity-select" class="filter-select">
                          <option value="-">-</option>
                          <option value="direct">yes</option>
                          <option value="">no</option>
                      </select>
                  </div>
                  <div class="select-item">
                      <label for="binding-energy">Binding Energy [meV/Å²]:</label>
                      <div class="range-input">
                          <div class="range-input-a">
                              <input type="number" id="binding-energy-min" name="binding-energy-min" step="0.1" placeholder="0.0" class="filter-input-number">
                              <span>-</span>
                              <input type="number" id="binding-energy-max" name="binding-energy-max" step="0.1" placeholder="4.0" class="filter-input-number">
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
      crystalSystem: document.getElementById("crystal-system").value,
      crystalPlane: document.getElementById("crystal-plane-search").value,
      polarity: document.getElementById("polarity-select").value,
      energyMin: document.getElementById("binding-energy-min").value,
      energyMax: document.getElementById("binding-energy-max").value,
    };

    // 執行篩選搜尋
    const searchInput2D = document.getElementById("2D");
    const searchInputSlab = document.getElementById("Slab");
    const searchTerm2D = searchInput2D ? searchInput2D.value.toLowerCase() : "";
    const searchTermSlab = searchInputSlab
      ? searchInputSlab.value.toLowerCase()
      : "";
    filterMaterialsWithCriteria(searchTerm2D, searchTermSlab, tempFilters);

    // 關閉模態視窗
    closeModal();
  });

  // Clear 按鈕點擊處理
  clearButton.addEventListener("click", function () {
    // 清空表單
    clearAllFilters();

    // 重置暫存的過濾條件
    tempFilters = {
      crystalSystem: "-",
      crystalPlane: "",
      polarity: "-",
      energyMin: "",
      energyMax: "",
    };
  });

  // Initial setup
  fetchMaterials();
  setupSearchHandlers();
  setupPaginationControls();
});

// Setup search handlers
function setupSearchHandlers() {
  const searchInput2D = document.getElementById("2D");
  const searchInputSlab = document.getElementById("Slab");

  const searchBtn = document.getElementById("search");

  // 添加輸入框的 keypress 事件處理
  searchInput2D.addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
      e.preventDefault(); // 防止表單提交
      // 直接執行搜尋
      const searchTerm2D = searchInput2D.value.toLowerCase();
      const searchTermSlab = searchInputSlab.value.toLowerCase();
      filterMaterialsWithCriteria(searchTerm2D, searchTermSlab, tempFilters);
    }
  });
  searchInputSlab.addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
      e.preventDefault(); // 防止表單提交
      // 直接執行搜尋
      const searchTerm2D = searchInput2D.value.toLowerCase();
      const searchTermSlab = searchInputSlab.value.toLowerCase();
      filterMaterialsWithCriteria(searchTerm2D, searchTermSlab, tempFilters);
    }
  });

  // 搜尋按鈕點擊事件
  searchBtn.addEventListener("click", (e) => {
    e.preventDefault();
    const searchTerm2D = searchInput2D.value.toLowerCase();
    const searchTermSlab = searchInputSlab.value.toLowerCase();
    filterMaterialsWithCriteria(searchTerm2D, searchTermSlab, tempFilters);
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
  document.querySelector("[data-crystal-plane]").value = "";
  document.getElementById("crystal-system").value = "-";
  document.getElementById("polarity-select").value = "-";
  document.getElementById("binding-energy-min").value = "";
  document.getElementById("binding-energy-max").value = "";
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
    updateMaterialCount(filteredMaterials.length);
  } catch (error) {
    console.error("Fetch error:", error);
    displayError("Error fetching materials data: " + error.message);
  }
}

// 根據使用者所給的條件進行篩選
function filterMaterialsWithCriteria(searchTerm2D, searchTermSlab, filters) {
  filteredMaterials = allMaterials.filter((material) => {
    const formula = material;
    const fullNameParts = formula.fullName.split("-");
    const planeName = fullNameParts[0] || "";
    const slabName = fullNameParts[1] || "";

    // 只在有搜尋條件且搜尋條件不為null時才檢查
    // 如果不符合條件就return false
    if (
      searchTerm2D &&
      searchTerm2D.trim() !== "" &&
      !planeName.toLowerCase().includes(searchTerm2D)
    ) {
      return false;
    }
    if (
      searchTermSlab &&
      searchTermSlab.trim() !== "" &&
      !slabName.toLowerCase().includes(searchTermSlab)
    ) {
      return false;
    }

    if (filters.crystalSystem !== "-") {
      const crystalSystem = material.crystalSystem || "";
      if (filters.crystalSystem !== crystalSystem) {
        return false;
      }
    }

    if (filters.crystalPlane && filters.crystalPlane.trim() !== "") {
      const crystalPlane = material.crystalPlane || "";
      if (
        !crystalPlane.toLowerCase().includes(filters.crystalPlane.toLowerCase())
      ) {
        return false;
      }
    }

    if (filters.polarity !== "-") {
      if (material.polaritySource !== filters.polarity) {
        return false;
      }
    }

    if (filters.energyMin !== "") {
      if (material.bindingEnergy < parseFloat(filters.energyMin)) {
        return false;
      }
    }
    if (filters.energyMax !== "") {
      if (material.bindingEnergy > parseFloat(filters.energyMax)) {
        return false;
      }
    }

    return true;
  });

  currentPage = 1;
  displayMaterials(filteredMaterials);
  updatePaginationControls(Math.ceil(filteredMaterials.length / itemsPerPage));
  updateMaterialCount(filteredMaterials.length);
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
    const formula = material.fullName;

    row.innerHTML = `
            <td>${formula}</td>
            <td>${
              material.bindingEnergy ? material.bindingEnergy.toFixed(3) : "-"
            }</td>
            <td>${material.polaritySource || "-"}</td>
            <td>${material.crystalSystem || "-"}</td>
            <td>${material.layerGroup || "-"}</td>
            <td>${material.crystalPlane || "-"}</td>
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
  const material = allMaterials.find((m) => m.fullName === materialName);

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

// Update material count display
function updateMaterialCount(count) {
  const materialCountElement = document.getElementById("materialCount");
  if (materialCountElement) {
    materialCountElement.textContent = `${count} materials found`;
  }
}

// Display error message
function displayError(message) {
  const materialList = document.getElementById("MaterialList");
  if (materialList) {
    materialList.innerHTML = `<tr><td colspan="6">${message}</td></tr>`;
  }
}
