console.log("VeriTraceX loaded");

// ---------------- START APP ----------------
function startApp() {
  document.getElementById("landing").style.display = "none";
  document.getElementById("app").style.display = "block";
}

// ---------------- PREVIEW ----------------
function previewImage() {
  const file = document.getElementById("fileInput").files[0];
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    alert("Only image files are allowed");
    return;
  }

  const reader = new FileReader();

  reader.onload = function (e) {
    const img = document.getElementById("preview");
    img.src = e.target.result;
    img.style.display = "block";
  };

  reader.readAsDataURL(file);
}

// ---------------- RESET ----------------
function resetApp() {
  document.getElementById("fileInput").value = "";
  document.getElementById("preview").style.display = "none";
  document.getElementById("result").innerHTML =
    "Upload an image to start verification...";
}

// ---------------- MAIN ANALYSIS ----------------
function checkFile() {
  const file = document.getElementById("fileInput").files[0];

  if (!file) {
    alert("Please upload an image");
    return;
  }

  if (!file.type.startsWith("image/")) {
    alert("Only image files are allowed");
    return;
  }

  const result = document.getElementById("result");
  result.innerHTML = "Analyzing...";

  const sizeKB = file.size / 1024;

  const reader = new FileReader();

  reader.onload = function (e) {
    const wordArray = CryptoJS.lib.WordArray.create(e.target.result);
    const hash = CryptoJS.SHA256(wordArray).toString();

    EXIF.getData(file, function () {
      const meta = EXIF.getAllTags(this);
      const hasMeta = meta && Object.keys(meta).length > 0;

      // ---------------- EVIDENCE SYSTEM ----------------
      const flags = {
        strong: [],
        medium: [],
        weak: []
      };

      // ---------------- STRONG EVIDENCE ----------------
      if (meta && meta.Software) {
        const soft = meta.Software.toLowerCase();

        if (
          soft.includes("photoshop") ||
          soft.includes("canva") ||
          soft.includes("gimp") ||
          soft.includes("lightroom")
        ) {
          flags.strong.push("Editing software detected: " + meta.Software);
        }
      }

      if (meta && meta.DateTimeOriginal && meta.ModifyDate) {
        try {
          const created = new Date(
            meta.DateTimeOriginal.replace(/:/g, "-")
          ).getTime();

          const modified = new Date(
            meta.ModifyDate.replace(/:/g, "-")
          ).getTime();

          if (modified > created) {
            flags.strong.push("Image modified after capture time");
          }
        } catch (err) {
          flags.medium.push("Timestamp format unreadable");
        }
      }

      // ---------------- MEDIUM EVIDENCE ----------------
      if (!hasMeta) {
        flags.medium.push("Metadata missing");
      }

      if (meta && (!meta.Make || !meta.Model)) {
        flags.medium.push("Camera information missing");
      }

      if (sizeKB < 100) {
        flags.medium.push("High compression detected");
      }

      // ---------------- WEAK EVIDENCE ----------------
      if (file.name.toLowerCase().includes("edit")) {
        flags.weak.push("Suspicious filename");
      }

      // ---------------- FINAL DECISION ----------------
      let grade, confidence, sourceType = "Unknown";

      const reasons = [...flags.strong, ...flags.medium, ...flags.weak];

      if (flags.strong.length > 0) {
        grade = "D";
        confidence = "Very Low (Manipulated Image Detected)";
        sourceType = "Edited Image";
      }
      else if (flags.medium.length >= 3) {
        grade = "C";
        confidence = "Low (Uncertain Image)";
      }
      else if (flags.medium.length >= 1 || flags.weak.length > 0) {
        grade = "B";
        confidence = "Medium (Processed Image)";
      }
      else {
        grade = "A";
        confidence = "High (Original Image)";
        sourceType = "Original Image";
      }

      showResult(grade, confidence, reasons, file, sizeKB, hash, sourceType);
    });
  };

  reader.readAsArrayBuffer(file);
}

// ---------------- OUTPUT FUNCTION ----------------
function showResult(grade, confidence, reasons, file, sizeKB, hash, sourceType) {

  const result = document.getElementById("result");

  let color = "white";

  if (grade === "A") color = "green";
  if (grade === "B") color = "orange";
  if (grade === "C") color = "darkorange";
  if (grade === "D") color = "red";

  let interpretation = [];

  if (grade === "A") {
    interpretation = ["Original image detected with no issues"];
  }
  if (grade === "B") {
    interpretation = ["Slightly processed or low metadata image"];
  }
  if (grade === "C") {
    interpretation = ["Highly uncertain image with multiple issues"];
  }
  if (grade === "D") {
    interpretation = ["Strong evidence of editing/manipulation"];
  }

  result.innerHTML = `
    <div style="
      border:1px solid #ccc;
      padding:20px;
      border-radius:12px;
      font-family:Arial;
      background:#0f172a;
      color:#e5e7eb;
      line-height:1.6;
    ">

      <h2 style="color:${color}">
        VeriTraceX Analysis Report
      </h2>

      <hr>

      <p><b>File Name:</b> ${file.name}</p>
      <p><b>File Size:</b> ${sizeKB.toFixed(2)} KB</p>
      <p><b>SHA-256 Hash:</b><br><small style="word-break:break-all;">${hash}</small></p>

      <hr>

      <p><b>Grade:</b> <span style="color:${color}">${grade}</span></p>
      <p><b>Type:</b> ${sourceType}</p>
      <p><b>Confidence:</b> ${confidence}</p>

      <hr>

      <h3>Evidence Found</h3>
      <ul>
        ${reasons.map(r => `<li>${r}</li>`).join("")}
      </ul>

      <h3>Interpretation</h3>
      <ul>
        ${interpretation.map(i => `<li>${i}</li>`).join("")}
      </ul>

    </div>
  `;
}