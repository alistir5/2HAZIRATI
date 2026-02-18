// --- تهيئة البيانات ---

// تم تعديل الأسعار لتناسب الدينار العراقي (آلاف الدنانير)
const products = [
    { 
        id: 1, 
        name: 'دجاجة بياضة', 
        img: 'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?auto=format&fit=crop&w=300&q=80', 
        price: 15000, 
        dailyProfit: 750, 
        period: 30,
        description: 'دجاجة بياضة من سلالة ممتازة، تنتج البيض يومياً. استثمار قصير المدى وعائد جيد.'
    },
    { 
        id: 2, 
        name: 'خروف عراقي', 
        img: 'https://images.unsplash.com/photo-1484557985045-6f550 ILd687?auto=format&fit=crop&w=300&q=80', 
        price: 75000, 
        dailyProfit: 4200, 
        period: 45,
        description: 'خروف نعيمي أصيل يعيش في مراعي طبيعية. نمو سريع وطلب عالي في السوق.'
    },
    { 
        id: 3, 
        name: 'بقرة هولندية', 
        img: 'https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?auto=format&fit=crop&w=300&q=80', 
        price: 225000, 
        dailyProfit: 14250, 
        period: 60,
        description: 'بقرة هولندية حلوب، إنتاجية عالية من الحليب يومياً. تعتبر العمود الفقري للمزرعة.'
    },
    { 
        id: 4, 
        name: 'حصان عربي', 
        img: 'https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?auto=format&fit=crop&w=300&q=80', 
        price: 750000, 
        dailyProfit: 52500, 
        period: 90,
        description: 'حصان عربي أصيل للسباقات والإنتاج. أعلى عائد استثماري ومكانة مرموقة.'
    }
];

const USER_ID = "8829301";
let currentSelectedProduct = null;
let currentQuantity = 1;
let hasInsurance = false;
const INSURANCE_PRICE = 3000; // تأمين بالدينار العراقي

// حفظ جديد ليتعرف على الأرقام الكبيرة
let userState = JSON.parse(localStorage.getItem('smartFarmUserV2')) || {
    balance: 150000, // رصيد افتراضي للتجربة بالدينار
    investments: []
};

// --- دوال مساعدة لترتيب الأرقام (الآلاف والدينار) ---
function formatMoney(amount) {
    return Math.floor(amount).toLocaleString('en-US') + ' د.ع';
}

function formatNumberOnly(amount) {
    return Math.floor(amount).toLocaleString('en-US');
}

// --- العناصر ---
const compactBalanceEl = document.getElementById('compact-balance'); // الرصيد المصغر
const balanceEl = document.getElementById('total-balance'); // رصيد المحفظة الكلي
const marketListEl = document.getElementById('market-list');
const investmentsListEl = document.getElementById('investments-list');
const activeCountEl = document.getElementById('active-count');
const emptyMsgEl = document.getElementById('empty-msg');

// عناصر المودال
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

// --- الوظائف ---

function initApp() {
    renderMarket();
    updateDashboard();
    setInterval(updateLiveProfits, 100);
    setupWalletButtons();
}

// 1. رسم السوق (الرئيسية) - تم إزالة الربح المتوقع من هنا
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
            <button onclick="openProductDetails(${product.id})" class="btn-details shadow-3d">التفاصيل</button>
        `;
        marketListEl.appendChild(card);
    });
}

// 2. فتح نافذة التفاصيل (الربح يظهر هنا فقط)
window.openProductDetails = function(id) {
    const product = products.find(p => p.id === id);
    currentSelectedProduct = product;
    currentQuantity = 1;
    hasInsurance = false;
    if(insuranceToggle) insuranceToggle.checked = false;

    if(modalImg) modalImg.src = product.img;
    if(modalTitle) modalTitle.textContent = product.name;
    if(modalDesc) modalDesc.textContent = product.description;
    if(modalPrice) modalPrice.textContent = formatMoney(product.price);
    if(modalPeriod) modalPeriod.textContent = product.period + ' يوم';

    updateModalCalculations();
    
    if(modalOverlay) modalOverlay.classList.remove('hidden');
    
    if(confirmBuyBtn) {
        confirmBuyBtn.onclick = function() {
            executeBuy();
        };
    }
};

// 3. التبديل والتأمين والكمية
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
    
    const basePrice = currentSelectedProduct.price * currentQuantity;
    const insuranceCost = hasInsurance ? (INSURANCE_PRICE * currentQuantity) : 0;
    const totalPrice = basePrice + insuranceCost;
    
    const totalDaily = currentSelectedProduct.dailyProfit * currentQuantity;
    const totalReturn = totalDaily * currentSelectedProduct.period;

    if(modalFinalPrice) modalFinalPrice.textContent = formatMoney(totalPrice);
    if(modalTotalProfit) modalTotalProfit.textContent = formatMoney(totalReturn);
    if(modalDaily) modalDaily.textContent = formatMoney(totalDaily); 
}

// 4. تنفيذ الشراء
function executeBuy() {
    if (!currentSelectedProduct) return;

    const basePrice = currentSelectedProduct.price * currentQuantity;
    const insuranceCost = hasInsurance ? (INSURANCE_PRICE * currentQuantity) : 0;
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
        alert('تم الشراء بنجاح! تم إضافة الحيوان إلى محفظتك.');
    } else {
        alert('عذراً، رصيدك غير كافي!');
    }
}

// 5. إغلاق النوافذ
window.closeModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if(modal) modal.classList.add('hidden');
};

// 6. تحديث الواجهة (تمت إضافة تنسيق فواصل الآلاف والدينار)
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

// 7. العداد اللحظي (تم تقليل الكسور لعرض منطقي للدينار العراقي)
function updateLiveProfits() {
    userState.investments.forEach(inv => {
        const now = Date.now();
        const timeToCalculate = now < inv.expiryDate ? now : inv.expiryDate;
        
        const timeElapsedInSeconds = (timeToCalculate - inv.purchaseTime) / 1000;
        const profitPerSecond = inv.dailyProfit / 86400;
        const currentProfit = timeElapsedInSeconds * profitPerSecond;
        
        const profitEl = document.getElementById(`profit-${inv.id}`);
        if (profitEl) {
            // إضافة كسرين لضمان استمرار حركة العداد مع الدينار
            profitEl.textContent = currentProfit.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ' د.ع';
        }
    });
}

// 8. إعدادات الإيداع والسحب
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
            } else {
                const message = encodeURIComponent(`مرحبا اود الايداع\nالايدي الخاص بي: ${USER_ID}`);
                window.location.href = `https://t.me/ar_2oa?text=${message}`;
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
            alert('تم تقديم طلب السحب بنجاح. سيتم تحويل الأرباح المتوفرة قريباً.');
        };
    } else {
        withdrawBtn.style.background = '#ecf0f1';
        withdrawBtn.style.color = '#7f8c8d';
        withdrawBtn.innerHTML = '<i class="fas fa-lock"></i> سحب مقفل';
        
        withdrawBtn.onclick = function() {
            alert('بعد انتها دوره الحيوان سوف تسحب ارباحك');
        };
    }
}

// 9. فتح البروفايل
window.openProfileModal = function() {
    const userIdDisplay = document.getElementById('user-id-display');
    const profileModal = document.getElementById('profile-modal');
    
    if(userIdDisplay) userIdDisplay.textContent = 'ID: ' + USER_ID;
    if(profileModal) profileModal.classList.remove('hidden');
};

// 10. التنقل بين الأقسام
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

function saveData() {
    localStorage.setItem('smartFarmUserV2', JSON.stringify(userState));
}

// تشغيل التطبيق
initApp();
