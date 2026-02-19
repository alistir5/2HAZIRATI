// --- تهيئة Firebase ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getDatabase, ref, set, get, onValue, update, push } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyAW-kOP33xeh0pmSuMdTsii9UWyabsnf1E",
    authDomain: "jhgjjgg-2952d.firebaseapp.com",
    databaseURL: "https://jhgjjgg-2952d-default-rtdb.firebaseio.com",
    projectId: "jhgjjgg-2952d",
    storageBucket: "jhgjjgg-2952d.firebasestorage.app",
    messagingSenderId: "322044108118",
    appId: "1:322044108118:web:d12cbc19d4411ede728af7"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// --- تهيئة البيانات ---
let products = [];
let USER_ID = "";
let currentSelectedProduct = null;
let currentQuantity = 1;
let hasInsurance = false;

let userState = {
    balance: 0,
    investments: [],
    name: "",
    banned: false
};

// --- دوال مساعدة لترتيب الأرقام ---
function formatMoney(amount) {
    return Math.floor(amount).toLocaleString('en-US') + ' د.ع';
}

function formatNumberOnly(amount) {
    return Math.floor(amount).toLocaleString('en-US');
}

// --- العناصر ---
const compactBalanceEl = document.getElementById('compact-balance');
const balanceEl = document.getElementById('total-balance');
const marketListEl = document.getElementById('market-list');
const investmentsListEl = document.getElementById('investments-list');
const activeCountEl = document.getElementById('active-count');
const emptyMsgEl = document.getElementById('empty-msg');

const modalOverlay = document.getElementById('product-modal');
const modalImg = document.getElementById('modal-img');
const modalTitle = document.getElementById('modal-title');
const modalDesc = document.getElementById('modal-desc');
const modalPrice = document.getElementById('modal-price');
const modalDaily = document.getElementById('modal-daily');
const modalPeriod = document.getElementById('modal-period');
const modalTotalProfit = document.getElementById('modal-total-profit');
const modalFinalPrice = document.getElementById('modal-final-price');
const qtyDisplay = document.getElementById('qty-display');
const confirmBuyBtn = document.getElementById('confirm-buy-btn');
const insuranceToggle = document.getElementById('insurance-toggle');

// دالة التنبيه المخصصة المتحركة
window.showCustomAlert = function(title, msg) {
    document.getElementById('alert-title').textContent = title;
    document.getElementById('alert-msg').textContent = msg;
    document.getElementById('alert-modal').classList.remove('hidden');
};

// --- نظام المصادقة والمزامنة ---
document.getElementById('google-login-btn').addEventListener('click', () => {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider).catch(error => alert("خطأ في تسجيل الدخول: " + error.message));
});

window.logout = function() {
    signOut(auth).then(() => {
        window.location.reload();
    });
};

onAuthStateChanged(auth, (user) => {
    if (user) {
        document.getElementById('login-overlay').style.display = 'none';
        document.getElementById('main-app').style.display = 'block';
        
        // إنشاء رقم ID عشوائي ومميز من الـ UID لتوافق الشكل القديم
        USER_ID = parseInt(user.uid.replace(/\D/g, '').substring(0, 7) || Math.floor(Math.random() * 9000000) + 1000000).toString();
        
        document.getElementById('user-name-display').textContent = `مرحباً، ${user.displayName.split(' ')[0]}`;
        document.getElementById('user-avatar').src = user.photoURL;
        document.getElementById('profile-modal-name').textContent = user.displayName;
        document.getElementById('profile-modal-img').src = user.photoURL;
        document.getElementById('user-id-display').textContent = 'ID: ' + USER_ID;

        // جلب بيانات المستخدم أو إنشاء مستخدم جديد
        const userRef = ref(db, 'users/' + USER_ID);
        onValue(userRef, (snapshot) => {
            if (snapshot.exists()) {
                userState = snapshot.val();
                if (!userState.investments) userState.investments = [];
                if (userState.banned) {
                    alert("عذراً، هذا الحساب محظور من قبل الإدارة.");
                    signOut(auth);
                    window.location.reload();
                }
            } else {
                userState = {
                    name: user.displayName,
                    balance: 150000, // رصيد افتراضي للتجربة
                    investments: [],
                    banned: false,
                    id: USER_ID
                };
                set(userRef, userState);
            }
            updateDashboard();
        });

        // جلب المنتجات من قاعدة البيانات
        onValue(ref(db, 'products'), (snapshot) => {
            products = [];
            if (snapshot.exists()) {
                snapshot.forEach(child => {
                    products.push({ id: child.key, ...child.val() });
                });
            }
            renderMarket();
        });

        setInterval(updateLiveProfits, 100);
        setupWalletButtons();

    } else {
        document.getElementById('login-overlay').style.display = 'flex';
        document.getElementById('main-app').style.display = 'none';
    }
});

function saveData() {
    if (USER_ID) {
        update(ref(db, 'users/' + USER_ID), userState);
    }
}

// --- الوظائف ---

function renderMarket() {
    if(!marketListEl) return;
    marketListEl.innerHTML = '';
    products.forEach(product => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            <img src="${product.img}" class="product-img shadow-3d" alt="${product.name}">
            <h3>${product.name}</h3>
            <span class="price-tag">${formatMoney(product.price)}</span>
            <button onclick="openProductDetails('${product.id}')" class="btn-details shadow-3d">التفاصيل</button>
        `;
        marketListEl.appendChild(card);
    });
}

window.openProductDetails = function(id) {
    const product = products.find(p => p.id === id);
    if (!product) return;
    currentSelectedProduct = product;
    currentQuantity = 1;
    hasInsurance = false;
    if(insuranceToggle) insuranceToggle.checked = false;

    if(modalImg) modalImg.src = product.img;
    if(modalTitle) modalTitle.textContent = product.name;
    if(modalDesc) modalDesc.textContent = product.description;
    if(modalPrice) modalPrice.textContent = formatMoney(product.price);
    if(modalPeriod) modalPeriod.textContent = product.period + ' يوم';

    // تحديث سعر التأمين ديناميكياً
    const insPrice = currentSelectedProduct.insurancePrice || 0;
    const insDisplay = document.getElementById('insurance-cost-display');
    if(insDisplay) insDisplay.textContent = formatNumberOnly(insPrice);

    updateModalCalculations();
    
    if(modalOverlay) modalOverlay.classList.remove('hidden');
    
    if(confirmBuyBtn) {
        confirmBuyBtn.onclick = function() {
            executeBuy();
        };
    }
};

window.updateQuantity = function(change) {
    if (currentQuantity + change >= 1) {
        currentQuantity += change;
        updateModalCalculations();
    }
};

window.toggleInsurance = function() {
    if(insuranceToggle) hasInsurance = insuranceToggle.checked;
    updateModalCalculations();
};

function updateModalCalculations() {
    if(qtyDisplay) qtyDisplay.textContent = currentQuantity;
    
    const dynamicInsurancePrice = currentSelectedProduct.insurancePrice || 0;
    const basePrice = currentSelectedProduct.price * currentQuantity;
    const insuranceCost = hasInsurance ? (dynamicInsurancePrice * currentQuantity) : 0;
    const totalPrice = basePrice + insuranceCost;
    
    const totalDaily = currentSelectedProduct.dailyProfit * currentQuantity;
    const totalReturn = totalDaily * currentSelectedProduct.period;

    if(modalFinalPrice) modalFinalPrice.textContent = formatMoney(totalPrice);
    if(modalTotalProfit) modalTotalProfit.textContent = formatMoney(totalReturn);
    if(modalDaily) modalDaily.textContent = formatMoney(totalDaily); 
}

function executeBuy() {
    if (!currentSelectedProduct) return;

    const dynamicInsurancePrice = currentSelectedProduct.insurancePrice || 0;
    const basePrice = currentSelectedProduct.price * currentQuantity;
    const insuranceCost = hasInsurance ? (dynamicInsurancePrice * currentQuantity) : 0;
    const totalPrice = basePrice + insuranceCost;

    if (userState.balance >= totalPrice) {
        userState.balance -= totalPrice;
        
        const now = Date.now();
        const expiryDate = now + (currentSelectedProduct.period * 24 * 60 * 60 * 1000);
        
        const totalDaily = currentSelectedProduct.dailyProfit * currentQuantity;
        const totalExpectedProfit = totalDaily * currentSelectedProduct.period;

        const newInvestment = {
            id: Date.now(),
            productId: currentSelectedProduct.id,
            name: currentSelectedProduct.name,
            img: currentSelectedProduct.img,
            dailyProfit: totalDaily,
            totalExpectedProfit: totalExpectedProfit,
            purchaseTime: now,
            expiryDate: expiryDate,
            quantity: currentQuantity,
            insured: hasInsurance
        };
        
        userState.investments.push(newInvestment);
        saveData();
        updateDashboard();
        closeModal('product-modal');
        showCustomAlert('تم بنجاح', 'تم الشراء بنجاح! تم إضافة الحيوان إلى محفظتك.');
    } else {
        showCustomAlert('عذراً', 'رصيدك غير كافي لإتمام هذه العملية!');
    }
}

window.closeModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if(modal) modal.classList.add('hidden');
};

function updateDashboard() {
    if(compactBalanceEl) compactBalanceEl.textContent = formatNumberOnly(userState.balance);
    if(balanceEl) balanceEl.textContent = formatMoney(userState.balance);
    if(activeCountEl) activeCountEl.textContent = userState.investments.length + ' حيوان';

    if(investmentsListEl) {
        investmentsListEl.innerHTML = '';
        if (userState.investments.length === 0) {
            if(emptyMsgEl) investmentsListEl.appendChild(emptyMsgEl);
        } else {
            userState.investments.forEach(inv => {
                const timeLeft = inv.expiryDate - Date.now();
                const daysLeft = Math.ceil(timeLeft / (1000 * 60 * 60 * 24));
                const isExpired = daysLeft <= 0;

                const div = document.createElement('div');
                div.className = 'investment-card';
                div.innerHTML = `
                    <div class="investment-card-header">
                        <div style="display:flex; align-items:center; gap:10px;">
                            <img src="${inv.img}" style="width:55px; height:55px; border-radius:50%; object-fit:cover; border: 2px solid var(--primary-color);">
                            <div class="inv-info">
                                <h4>${inv.name} (x${inv.quantity}) ${inv.insured ? '🛡️' : ''}</h4>
                                <small>متبقي: ${isExpired ? 'منتهي ومتاح للسحب' : daysLeft + ' يوم'}</small>
                            </div>
                        </div>
                        <div class="live-profit shadow-3d" id="profit-${inv.id}">0.00 د.ع</div>
                    </div>
                    <div class="locked-profit-msg">
                        ${isExpired ? '✅ تم انتهاء الدورة، الأرباح متاحة للسحب' : `⏳ يمكنك سحب الأرباح المتوقعة (${formatMoney(inv.totalExpectedProfit)}) بعد انتهاء الدورة`}
                    </div>
                `;
                investmentsListEl.appendChild(div);
            });
        }
    }
    
    checkWithdrawStatus();
}

function updateLiveProfits() {
    userState.investments.forEach(inv => {
        const now = Date.now();
        const timeToCalculate = now < inv.expiryDate ? now : inv.expiryDate;
        
        const timeElapsedInSeconds = (timeToCalculate - inv.purchaseTime) / 1000;
        const profitPerSecond = inv.dailyProfit / 86400;
        const currentProfit = timeElapsedInSeconds * profitPerSecond;
        
        const profitEl = document.getElementById(`profit-${inv.id}`);
        if (profitEl) {
            profitEl.textContent = currentProfit.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ' د.ع';
        }
    });
}

function setupWalletButtons() {
    const depositBtn = document.querySelector('.deposit'); 
    
    if (depositBtn) {
        depositBtn.onclick = function() {
            const depositModal = document.getElementById('deposit-modal');
            const countdownEl = document.getElementById('countdown-timer');
            
            if (depositModal && countdownEl) {
                let counter = 3;
                depositModal.classList.remove('hidden');
                countdownEl.textContent = counter;
                
                const interval = setInterval(() => {
                    counter--;
                    if (counter > 0) {
                        countdownEl.textContent = counter;
                    } else {
                        clearInterval(interval);
                        depositModal.classList.add('hidden');
                        
                        const message = encodeURIComponent(`مرحبا اود الايداع\nالايدي الخاص بي: ${USER_ID}`);
                        window.location.href = `https://t.me/ar_2oa?text=${message}`;
                    }
                }, 1000);
            }
        };
    }
}

function checkWithdrawStatus() {
    const withdrawBtn = document.querySelector('.withdraw');
    if (!withdrawBtn) return;
    
    const hasExpired = userState.investments.some(inv => Date.now() >= inv.expiryDate);
    
    if (hasExpired) {
        withdrawBtn.style.background = 'white';
        withdrawBtn.style.color = 'var(--dark-green)';
        withdrawBtn.innerHTML = '<i class="fas fa-arrow-down"></i> سحب متاح';
        
        withdrawBtn.onclick = function() {
            document.getElementById('withdraw-name').value = userState.name;
            document.getElementById('withdraw-modal').classList.remove('hidden');
        };
    } else {
        withdrawBtn.style.background = '#ecf0f1';
        withdrawBtn.style.color = '#7f8c8d';
        withdrawBtn.innerHTML = '<i class="fas fa-lock"></i> سحب مقفل';
        
        withdrawBtn.onclick = function() {
            showCustomAlert('سحب مقفل', 'بعد انتهاء دورة الحيوان سوف تتمكن من سحب أرباحك.');
        };
    }
}

// دالة تنفيذ السحب (الجديدة)
window.submitWithdrawal = function() {
    const name = document.getElementById('withdraw-name').value;
    const amount = parseFloat(document.getElementById('withdraw-amount').value);
    const method = document.getElementById('withdraw-method').value;
    const notes = document.getElementById('withdraw-notes').value;

    if(!name || !amount || !method) {
        showCustomAlert('بيانات ناقصة', 'يرجى تعبئة الحقول الأساسية (الاسم، المبلغ، رقم الحساب).');
        return;
    }

    if(amount > userState.balance) {
        showCustomAlert('رصيد غير كافٍ', 'عذراً، المبلغ المطلوب سحبه أكبر من رصيدك المتاح في المحفظة.');
        return;
    }

    if(amount <= 0) {
        showCustomAlert('خطأ', 'يرجى إدخال مبلغ سحب صحيح.');
        return;
    }

    // خصم الرصيد من المحفظة
    userState.balance -= amount;
    saveData();
    updateDashboard();

    // إرسال طلب السحب للإدارة
    const withdrawalRef = push(ref(db, 'withdrawals'));
    set(withdrawalRef, {
        userId: USER_ID,
        name: name,
        amount: amount,
        method: method,
        notes: notes,
        timestamp: Date.now(),
        status: 'pending'
    });

    closeModal('withdraw-modal');
    // تنظيف الحقول
    document.getElementById('withdraw-amount').value = '';
    document.getElementById('withdraw-method').value = '';
    document.getElementById('withdraw-notes').value = '';
    
    showCustomAlert('تم بنجاح', 'تم تقديم طلب السحب بنجاح وتم خصم الرصيد من محفظتك. يرجى انتظار التحويل من الإدارة المالية.');
};

window.openProfileModal = function() {
    const profileModal = document.getElementById('profile-modal');
    if(profileModal) profileModal.classList.remove('hidden');
};

window.showSection = function(sectionId, element) {
    const marketSection = document.getElementById('market-section');
    const myFarmSection = document.getElementById('my-farm-section');
    
    if(marketSection) marketSection.style.display = 'none';
    if(myFarmSection) myFarmSection.style.display = 'none';
    
    const targetSection = document.getElementById(sectionId);
    if(targetSection) targetSection.style.display = 'block';
    
    document.querySelectorAll('.bottom-nav .nav-item').forEach(el => {
        el.classList.remove('active');
        if(el.classList.contains('center-nav')) {
            el.classList.remove('animate__pulse', 'animate__infinite');
        }
    });
    
    if(element) {
        element.classList.add('active');
        if(element.classList.contains('center-nav')) {
            element.classList.add('animate__pulse', 'animate__infinite');
        }
    }
};
