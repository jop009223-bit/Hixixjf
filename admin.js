// ==================== التحقق من Firebase ====================
if (typeof firebase === 'undefined') {
    console.error('❌ Firebase not loaded!');
    alert('خطأ: لم يتم تحميل Firebase. تأكد من اتصالك بالإنترنت');
}

if (!db) {
    console.error('❌ Firestore not initialized!');
    alert('خطأ: لم يتم تهيئة قاعدة البيانات');
}

// ==================== المتغيرات العامة ====================
let currentKeys = [];
let keysChart = null;

// ==================== عند تحميل الصفحة ====================
document.addEventListener('DOMContentLoaded', function() {
    if (!db) {
        showAlert('خطأ في الاتصال بقاعدة البيانات', 'error');
        return;
    }
    
    showFirebaseStatus();
    loadKeys();
    updateDateTime();
    setInterval(updateDateTime, 1000);
    setupEventListeners();
});

// ==================== عرض حالة Firebase ====================
function showFirebaseStatus() {
    const statusDiv = document.createElement('div');
    statusDiv.className = 'firebase-status';
    statusDiv.id = 'firebaseStatus';
    statusDiv.innerHTML = '<i class="fas fa-sync-alt fa-spin"></i> جاري الاتصال بـ Firebase...';
    document.body.appendChild(statusDiv);
    
    setTimeout(() => {
        const status = document.getElementById('firebaseStatus');
        if (status) {
            if (db) {
                status.innerHTML = '<i class="fas fa-check-circle"></i> ✅ متصل بـ Firebase بنجاح';
                status.classList.remove('error');
                
                setTimeout(() => {
                    status.style.display = 'none';
                }, 3000);
            } else {
                status.innerHTML = '<i class="fas fa-exclamation-circle"></i> ❌ خطأ في الاتصال بـ Firebase';
                status.classList.add('error');
            }
        }
    }, 1000);
}

// ==================== إعداد مستمعي الأحداث ====================
function setupEventListeners() {
    const toggleBtn = document.getElementById('toggleSidebar');
    if (toggleBtn) toggleBtn.addEventListener('click', toggleSidebar);
    
    document.querySelectorAll('.sidebar-nav li').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            if (this.dataset.tab) switchTab(this.dataset.tab);
        });
    });
    
    const generateBtn = document.getElementById('generateCode');
    if (generateBtn) generateBtn.addEventListener('click', generateRandomCode);
    
    const createForm = document.getElementById('createKeyForm');
    if (createForm) createForm.addEventListener('submit', createNewKey);
    
    const refreshBtn = document.getElementById('refreshData');
    if (refreshBtn) refreshBtn.addEventListener('click', refreshData);
    
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.addEventListener('input', filterKeys);
    
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) statusFilter.addEventListener('change', filterKeys);
    
    const sortBy = document.getElementById('sortBy');
    if (sortBy) sortBy.addEventListener('change', sortKeys);
    
    const resetBtn = document.querySelector('.btn-reset');
    if (resetBtn) resetBtn.addEventListener('click', resetForm);
}

// ==================== تبديل القائمة الجانبية ====================
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const icon = document.querySelector('#toggleSidebar i');
    
    if (sidebar) {
        sidebar.classList.toggle('collapsed');
        
        if (icon) {
            if (sidebar.classList.contains('collapsed')) {
                icon.classList.remove('fa-chevron-right');
                icon.classList.add('fa-chevron-left');
            } else {
                icon.classList.remove('fa-chevron-left');
                icon.classList.add('fa-chevron-right');
            }
        }
    }
}

// ==================== تبديل التبويبات ====================
function switchTab(tabId) {
    document.querySelectorAll('.sidebar-nav li').forEach(item => {
        item.classList.remove('active');
    });
    
    const activeTab = document.querySelector(`[data-tab="${tabId}"]`);
    if (activeTab) activeTab.classList.add('active');
    
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.remove('active');
    });
    
    const activePane = document.getElementById(`${tabId}-tab`);
    if (activePane) activePane.classList.add('active');
    
    if (tabId === 'keys-list') {
        displayKeys(currentKeys);
    } else if (tabId === 'dashboard') {
        updateChart();
    }
}

// ==================== تحديث التاريخ والوقت ====================
function updateDateTime() {
    const now = new Date();
    const options = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    };
    
    const dateTimeElement = document.getElementById('currentDateTime');
    if (dateTimeElement) {
        dateTimeElement.textContent = now.toLocaleDateString('ar-EG', options);
    }
}

// ==================== توليد كود عشوائي ====================
function generateRandomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const segments = [];
    
    for (let i = 0; i < 3; i++) {
        let segment = '';
        for (let j = 0; j < 4; j++) {
            segment += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        segments.push(segment);
    }
    
    const code = segments.join('-');
    const keyCodeInput = document.getElementById('keyCode');
    if (keyCodeInput) keyCodeInput.value = code;
}

// ==================== إنشاء مفتاح جديد ====================
async function createNewKey(e) {
    e.preventDefault();
    
    const keyData = {
        name: document.getElementById('keyName')?.value || '',
        type: document.getElementById('keyType')?.value || 'basic',
        code: document.getElementById('keyCode')?.value || '',
        duration: parseInt(document.getElementById('duration')?.value) || 30,
        maxUsers: parseInt(document.getElementById('maxUsers')?.value) || 1,
        status: 'active',
        currentUsers: 0,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        createdBy: 'admin',
        expiresAt: new Date(Date.now() + (parseInt(document.getElementById('duration')?.value || 30) * 24 * 60 * 60 * 1000))
    };
    
    if (!keyData.name || !keyData.code) {
        showAlert('من فضلك أدخل جميع البيانات المطلوبة', 'warning');
        return;
    }
    
    try {
        const existingKey = await db.collection('keys').where('code', '==', keyData.code).get();
        if (!existingKey.empty) {
            showAlert('هذا الكود موجود بالفعل', 'error');
            return;
        }
        
        await db.collection('keys').add(keyData);
        showAlert('تم إنشاء المفتاح بنجاح!', 'success');
        resetForm();
        loadKeys();
        switchTab('keys-list');
        
    } catch (error) {
        console.error('Error creating key:', error);
        showAlert('حدث خطأ أثناء إنشاء المفتاح', 'error');
    }
}

// ==================== تحميل المفاتيح من Firebase ====================
async function loadKeys() {
    try {
        const snapshot = await db.collection('keys').orderBy('createdAt', 'desc').get();
        currentKeys = [];
        
        snapshot.forEach(doc => {
            currentKeys.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        displayKeys(currentKeys);
        updateQuickStats();
        updateChart();
        updateRecentKeys();
        
    } catch (error) {
        console.error('Error loading keys:', error);
        showAlert('حدث خطأ في تحميل المفاتيح', 'error');
    }
}

// ==================== عرض المفاتيح ====================
function displayKeys(keys) {
    const container = document.getElementById('keysList');
    if (!container) return;
    
    if (!keys || keys.length === 0) {
        container.innerHTML = `
            <div class="no-keys">
                <i class="fas fa-key fa-3x"></i>
                <p>لا توجد مفاتيح حتى الآن</p>
                <button onclick="switchTab('create-key')" class="btn-submit">
                    <i class="fas fa-plus"></i> إنشاء أول مفتاح
                </button>
            </div>
        `;
        return;
    }
    
    let html = '';
    keys.forEach(key => {
        const createdAt = key.createdAt ? new Date(key.createdAt.seconds * 1000).toLocaleDateString('ar-EG') : 'غير محدد';
        const expiresAt = key.expiresAt ? new Date(key.expiresAt).toLocaleDateString('ar-EG') : 'غير محدد';
        const isExpired = key.expiresAt && new Date(key.expiresAt) < new Date();
        
        html += `
            <div class="key-card ${key.status === 'active' && !isExpired ? 'active' : 'inactive'}" data-id="${key.id}">
                <span class="key-badge ${key.type}">${key.type === 'premium' ? 'مميز' : key.type === 'vip' ? 'VIP' : 'أساسي'}</span>
                
                <div class="key-header">
                    <div class="key-icon">
                        <i class="fas fa-key"></i>
                    </div>
                    <div class="key-info">
                        <h4>${key.name}</h4>
                        <p>تم الإنشاء: ${createdAt}</p>
                    </div>
                </div>
                
                <div class="key-code-display">
                    ${key.code}
                    <button class="copy-btn" onclick="copyToClipboard('${key.code}')">
                        <i class="far fa-copy"></i>
                    </button>
                </div>
                
                <div class="key-details">
                    <div class="detail-item">
                        <span class="label"><i class="far fa-clock"></i> المدة:</span>
                        <span class="value">${key.duration} يوم</span>
                    </div>
                    <div class="detail-item">
                        <span class="label"><i class="fas fa-users"></i> المستخدمون:</span>
                        <span class="value">${key.currentUsers || 0} / ${key.maxUsers}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label"><i class="far fa-calendar-alt"></i> ينتهي:</span>
                        <span class="value">${expiresAt}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label"><i class="fas fa-info-circle"></i> الحالة:</span>
                        <span class="value ${isExpired ? 'text-danger' : ''}">
                            ${isExpired ? 'منتهي الصلاحية' : (key.status === 'active' ? 'نشط' : 'معطل')}
                        </span>
                    </div>
                </div>
                
                <div class="key-actions">
                    <button class="btn-action toggle ${key.status === 'active' ? '' : 'off'}" 
                            onclick="toggleKeyStatus('${key.id}', '${key.status}')">
                        <i class="fas ${key.status === 'active' ? 'fa-pause' : 'fa-play'}"></i>
                    </button>
                    <button class="btn-action edit" onclick="editKey('${key.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-action delete" onclick="deleteKey('${key.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// ==================== تحديث الإحصائيات السريعة ====================
function updateQuickStats() {
    const totalKeys = currentKeys.length;
    const activeKeys = currentKeys.filter(k => k.status === 'active' && (!k.expiresAt || new Date(k.expiresAt) > new Date())).length;
    const inactiveKeys = currentKeys.filter(k => k.status === 'inactive' || (k.expiresAt && new Date(k.expiresAt) <= new Date())).length;
    const totalUsers = currentKeys.reduce((sum, key) => sum + (key.currentUsers || 0), 0);
    
    const totalKeysEl = document.getElementById('totalKeys');
    const activeKeysEl = document.getElementById('activeKeys');
    const inactiveKeysEl = document.getElementById('inactiveKeys');
    const totalUsersEl = document.getElementById('totalUsers');
    
    if (totalKeysEl) totalKeysEl.textContent = totalKeys;
    if (activeKeysEl) activeKeysEl.textContent = activeKeys;
    if (inactiveKeysEl) inactiveKeysEl.textContent = inactiveKeys;
    if (totalUsersEl) totalUsersEl.textContent = totalUsers;
}

// ==================== تحديث الرسم البياني ====================
function updateChart() {
    const ctx = document.getElementById('keysChart')?.getContext('2d');
    if (!ctx) return;
    
    const activeCount = currentKeys.filter(k => k.status === 'active').length;
    const inactiveCount = currentKeys.filter(k => k.status === 'inactive').length;
    const expiredCount = currentKeys.filter(k => k.expiresAt && new Date(k.expiresAt) <= new Date()).length;
    
    if (keysChart) keysChart.destroy();
    
    keysChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['نشط', 'معطل', 'منتهي الصلاحية'],
            datasets: [{
                data: [activeCount, inactiveCount, expiredCount],
                backgroundColor: ['#4cc9f0', '#f72585', '#f8961e'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// ==================== تحديث آخر المفاتيح ====================
function updateRecentKeys() {
    const recentContainer = document.getElementById('recentKeys');
    if (!recentContainer) return;
    
    const recentKeys = currentKeys.slice(0, 5);
    
    if (recentKeys.length === 0) {
        recentContainer.innerHTML = '<p class="no-data">لا توجد مفاتيح مضافة</p>';
        return;
    }
    
    let html = '';
    recentKeys.forEach(key => {
        html += `
            <div class="recent-key-item">
                <div class="recent-key-info">
                    <i class="fas fa-key"></i>
                    <div>
                        <h5>${key.name}</h5>
                        <small>${key.code}</small>
                    </div>
                </div>
                <span class="recent-key-status ${key.status}">
                    ${key.status === 'active' ? 'نشط' : 'معطل'}
                </span>
            </div>
        `;
    });
    
    recentContainer.innerHTML = html;
}

// ==================== تغيير حالة المفتاح ====================
async function toggleKeyStatus(keyId, currentStatus) {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    
    const result = await Swal.fire({
        title: 'تأكيد التغيير',
        text: `هل تريد ${newStatus === 'active' ? 'تفعيل' : 'تعطيل'} هذا المفتاح؟`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'نعم',
        cancelButtonText: 'لا',
        confirmButtonColor: '#4361ee',
        cancelButtonColor: '#f72585'
    });
    
    if (result.isConfirmed) {
        try {
            await db.collection('keys').doc(keyId).update({
                status: newStatus
            });
            
            showAlert(`تم ${newStatus === 'active' ? 'تفعيل' : 'تعطيل'} المفتاح بنجاح`, 'success');
            loadKeys();
            
        } catch (error) {
            console.error('Error toggling key status:', error);
            showAlert('حدث خطأ', 'error');
        }
    }
}

// ==================== حذف مفتاح ====================
async function deleteKey(keyId) {
    const result = await Swal.fire({
        title: 'تأكيد الحذف',
        text: 'هل أنت متأكد من حذف هذا المفتاح؟ لا يمكن التراجع عن هذا الإجراء',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#f72585',
        cancelButtonColor: '#4361ee',
        confirmButtonText: 'نعم، احذف',
        cancelButtonText: 'إلغاء'
    });
    
    if (result.isConfirmed) {
        try {
            await db.collection('keys').doc(keyId).delete();
            showAlert('تم حذف المفتاح بنجاح', 'success');
            loadKeys();
            
        } catch (error) {
            console.error('Error deleting key:', error);
            showAlert('حدث خطأ في الحذف', 'error');
        }
    }
}

// ==================== نسخ النص ====================
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showAlert('تم النسخ بنجاح!', 'success');
    }).catch(() => {
        showAlert('فشل النسخ', 'error');
    });
}

// ==================== تصفية المفاتيح ====================
function filterKeys() {
    const searchInput = document.getElementById('searchInput');
    const statusFilter = document.getElementById('statusFilter');
    
    if (!searchInput || !statusFilter) return;
    
    const searchTerm = searchInput.value.toLowerCase();
    const status = statusFilter.value;
    
    let filtered = currentKeys;
    
    if (searchTerm) {
        filtered = filtered.filter(key => 
            key.name.toLowerCase().includes(searchTerm) || 
            key.code.toLowerCase().includes(searchTerm)
        );
    }
    
    if (status !== 'all') {
        filtered = filtered.filter(key => key.status === status);
    }
    
    displayKeys(filtered);
}

// ==================== ترتيب المفاتيح ====================
function sortKeys() {
    const sortBy = document.getElementById('sortBy');
    if (!sortBy) return;
    
    const sortValue = sortBy.value;
    let sorted = [...currentKeys];
    
    switch(sortValue) {
        case 'name':
            sorted.sort((a, b) => a.name.localeCompare(b.name));
            break;
        case 'users':
            sorted.sort((a, b) => (b.currentUsers || 0) - (a.currentUsers || 0));
            break;
        case 'date':
        default:
            sorted.sort((a, b) => {
                if (!a.createdAt) return 1;
                if (!b.createdAt) return -1;
                return b.createdAt.seconds - a.createdAt.seconds;
            });
    }
    
    displayKeys(sorted);
}

// ==================== إعادة تعيين النموذج ====================
function resetForm() {
    const form = document.getElementById('createKeyForm');
    if (form) {
        form.reset();
        generateRandomCode();
    }
}

// ==================== تحديث البيانات ====================
function refreshData() {
    showAlert('جاري تحديث البيانات...', 'info');
    loadKeys();
}

// ==================== تعديل مفتاح ====================
function editKey(keyId) {
    showAlert('قريباً - خاصية التعديل', 'info');
}

// ==================== عرض التنبيهات ====================
function showAlert(message, type) {
    const Toast = Swal.mixin({
        toast: true,
        position: 'top-start',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true
    });
    
    Toast.fire({
        icon: type,
        title: message
    });
}