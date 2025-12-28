// Toggle between account and product forms
const accountSection = document.getElementById('accountSection');
const productSection = document.getElementById('productSection');
document.getElementById('toProduct').onclick = () => {
  accountSection.style.display = 'none';
  productSection.style.display = '';
};
document.getElementById('toAccount').onclick = () => {
  productSection.style.display = 'none';
  accountSection.style.display = '';
};

// Handle farmer account creation (demo: local only)
document.getElementById('farmerAccountForm').onsubmit = function(e) {
  e.preventDefault();
  const name = document.getElementById('farmerName').value.trim();
  const email = document.getElementById('farmerEmail').value.trim();
  const password = document.getElementById('farmerPassword').value;
  const result = document.getElementById('accountResult');
  const anim = document.getElementById('accountSuccessAnim');
  if (!name || !email || !password) {
    result.textContent = 'Please fill all fields.';
    result.style.color = 'red';
    return;
  }
  // Store farmer name in localStorage for session
  localStorage.setItem('farmerName', name);
  showWelcome();
  result.textContent = 'Account created successfully! Now add your crops or vegetables below.';
  result.style.color = 'green';
  this.reset();
  anim.style.display = 'flex';
  setTimeout(() => {
    anim.style.display = 'none';
    accountSection.style.display = 'none';
    productSection.style.display = '';
    document.getElementById('productName').focus();
  }, 1200);
};
// Show welcome bar if farmer is signed in
function showWelcome() {
  const farmerName = localStorage.getItem('farmerName');
  const welcomeDiv = document.getElementById('farmerWelcome');
  const nameSpan = document.getElementById('farmerNameDisplay');
  if (farmerName) {
    nameSpan.textContent = farmerName;
    welcomeDiv.style.display = '';
  } else {
    welcomeDiv.style.display = 'none';
  }
}

// Logout handler
document.getElementById('logoutBtn').onclick = function() {
  localStorage.removeItem('farmerName');
  showWelcome();
  // Reset to account creation form
  productSection.style.display = 'none';
  accountSection.style.display = '';
};

// On page load, show welcome if signed in
showWelcome();

// Handle product upload (demo: POST to backend if available)
document.getElementById('productForm').onsubmit = async function(e) {
  e.preventDefault();
  const name = document.getElementById('productName').value.trim();
  const category = document.getElementById('category').value;
  const price = parseFloat(document.getElementById('price').value);
  const result = document.getElementById('productResult');
  const anim = document.getElementById('productSuccessAnim');
  if (!name || !category || isNaN(price) || price <= 0) {
    result.textContent = 'Please fill all fields with valid values.';
    result.style.color = 'red';
    return;
  }
  try {
    const resp = await fetch('http://localhost:5001/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, category, price })
    });
    if (resp.ok) {
      const data = await resp.json();
      if (data && data.success) {
        result.textContent = 'Product added successfully!';
        result.style.color = 'green';
        this.reset();
        anim.style.display = 'flex';
        setTimeout(() => {
          anim.style.display = 'none';
        }, 1200);
      } else {
        result.textContent = 'Upload failed: ' + (data.message || 'Unknown error');
        result.style.color = 'red';
      }
    } else {
      result.textContent = 'Server error: ' + resp.status;
      result.style.color = 'red';
    }
  } catch (err) {
    result.textContent = 'Network error: ' + err;
    result.style.color = 'red';
  }
};
