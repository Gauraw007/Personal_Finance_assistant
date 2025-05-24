// Global variables
let transactions = [];
let investments = [];
let budgets = {};
let currentBalance = 0;

// API endpoints
const API_BASE_URL = 'http://localhost:3000/api';

// Currency formatter
const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR'
    }).format(amount);
};

// Tab switching functionality
function switchTab(tabId) {
    // Hide all tab contents
    const tabContents = document.getElementsByClassName('tab-content');
    for (let content of tabContents) {
        content.classList.remove('active');
    }

    // Remove active class from all tabs
    const tabs = document.getElementsByClassName('nav-tab');
    for (let tab of tabs) {
        tab.classList.remove('active');
    }

    // Show selected tab content and activate tab button
    document.getElementById(tabId).classList.add('active');
    event.currentTarget.classList.add('active');

    // Scroll to the top of the selected tab content
    document.getElementById(tabId).scrollIntoView({ behavior: 'smooth' });

    // Update dashboard when switching to it
    if (tabId === 'dashboard') {
        updateDashboard();
    }
    if (tabId === 'budget') {
        updateBudgetOverview();
    }
}

// Fetch data from API
async function fetchData(endpoint) {
    try {
        const response = await fetch(`${API_BASE_URL}/${endpoint}`);
        if (!response.ok) throw new Error('Network response was not ok');
        return await response.json();
    } catch (error) {
        console.error('Error fetching data:', error);
        return null;
    }
}

// Post data to API
async function postData(endpoint, data) {
    try {
        const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Network response was not ok');
        return await response.json();
    } catch (error) {
        console.error('Error posting data:', error);
        return null;
    }
}

// Initialize the dashboard when the page loads
document.addEventListener('DOMContentLoaded', async function() {
    // Set initial active tab
    switchTab('dashboard');

    // Load initial data
    await loadDashboardData();
    await loadTransactions();
    await loadInvestments();
    await loadBudgets();
});

// Load dashboard data
async function loadDashboardData() {
    const data = await fetchData('dashboard-summary');
    if (data) {
        document.getElementById('current-balance').textContent = formatCurrency(data.current_balance);
        document.getElementById('total-investments').textContent = formatCurrency(data.total_investments);
        document.getElementById('monthly-expenses').textContent = formatCurrency(data.monthly_expenses);
    }
    initializeDashboard();
}

// Load transactions
async function loadTransactions() {
    const transactions = await fetchData('transactions');
    if (transactions) {
        updateTransactionTable(transactions);
    }
}

// Load investments
async function loadInvestments() {
    const investments = await fetchData('investments');
    if (investments) {
        updateInvestmentTable(investments);
    }
}

// Load budgets
async function loadBudgets() {
    const currentMonth = new Date().toLocaleString('default', { month: 'long' });
    const currentYear = new Date().getFullYear();
    const budgets = await fetchData(`budgets?month=${currentMonth}&year=${currentYear}`);
    if (budgets) {
        updateBudgetOverview(budgets);
    }
}

// Dashboard initialization
function initializeDashboard() {
    // Sample data for the financial chart
    const ctx = document.getElementById('financialChart').getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [{
                label: 'Income',
                data: [50000, 55000, 48000, 60000, 52000, 58000],
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.1
            }, {
                label: 'Expenses',
                data: [30000, 32000, 28000, 35000, 31000, 33000],
                borderColor: 'rgb(255, 99, 132)',
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// Form submission handlers
document.getElementById('transaction-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    const formData = {
        date: new Date().toISOString().split('T')[0],
        description: document.getElementById('description').value,
        amount: parseFloat(document.getElementById('amount').value),
        category: document.getElementById('category').value,
        type: document.getElementById('transaction-type').value
    };

    const result = await postData('transactions', formData);
    if (result) {
        alert('Transaction added successfully!');
        this.reset();
        await loadDashboardData();
        await loadTransactions();
    }
});

document.getElementById('investment-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    const formData = {
        name: document.getElementById('investment-name').value,
        type: document.getElementById('investment-type').value,
        amount_invested: parseFloat(document.getElementById('investment-amount').value),
        current_value: parseFloat(document.getElementById('current-value').value) || parseFloat(document.getElementById('investment-amount').value),
        date_invested: new Date().toISOString().split('T')[0]
    };

    const result = await postData('investments', formData);
    if (result) {
        alert('Investment added successfully!');
        this.reset();
        await loadDashboardData();
        await loadInvestments();
    }
});

document.getElementById('budget-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    const currentMonth = new Date().toLocaleString('default', { month: 'long' });
    const currentYear = new Date().getFullYear();
    
    const formData = {
        category: document.getElementById('budget-category').value,
        amount: parseFloat(document.getElementById('budget-amount').value),
        month: currentMonth,
        year: currentYear
    };

    const result = await postData('budgets', formData);
    if (result) {
        alert('Budget set successfully!');
        this.reset();
        await loadBudgets();
    }
});

// Tax calculation and saving
async function calculateTax() {
    const income = parseFloat(document.getElementById('annual-income').value) || 0;
    const regime = document.getElementById('tax-regime').value;
    const deductions = parseFloat(document.getElementById('deductions').value) || 0;

    let taxableIncome = income;
    if (regime === 'old') {
        taxableIncome = Math.max(0, income - deductions);
    }

    let tax = 0;
    if (regime === 'new') {
        // New tax regime slabs
        if (taxableIncome <= 300000) tax = 0;
        else if (taxableIncome <= 600000) tax = (taxableIncome - 300000) * 0.05;
        else if (taxableIncome <= 900000) tax = 15000 + (taxableIncome - 600000) * 0.10;
        else if (taxableIncome <= 1200000) tax = 45000 + (taxableIncome - 900000) * 0.15;
        else if (taxableIncome <= 1500000) tax = 90000 + (taxableIncome - 1200000) * 0.20;
        else tax = 150000 + (taxableIncome - 1500000) * 0.30;
    } else {
        // Old tax regime slabs
        if (taxableIncome <= 250000) tax = 0;
        else if (taxableIncome <= 500000) tax = (taxableIncome - 250000) * 0.05;
        else if (taxableIncome <= 1000000) tax = 12500 + (taxableIncome - 500000) * 0.20;
        else tax = 112500 + (taxableIncome - 1000000) * 0.30;
    }

    // Update the tax display
    document.getElementById('gross-income').textContent = `₹${income.toLocaleString()}`;
    document.getElementById('taxable-income').textContent = `₹${taxableIncome.toLocaleString()}`;
    document.getElementById('tax-payable').textContent = `₹${tax.toLocaleString()}`;
    document.getElementById('in-hand-salary').textContent = `₹${(income - tax).toLocaleString()}`;

    // Save tax record
    const currentYear = new Date().getFullYear();
    const financialYear = `${currentYear}-${currentYear + 1}`;
    
    const taxRecord = {
        financial_year: financialYear,
        gross_income: income,
        taxable_income: taxableIncome,
        tax_paid: tax,
        regime: regime,
        deductions: deductions
    };

    const result = await postData('tax-records', taxRecord);
    if (result) {
        alert('Tax record saved successfully!');
    }
}

// Update transaction table
function updateTransactionTable(transactions) {
    const tbody = document.getElementById('transaction-table-body');
    tbody.innerHTML = '';
    
    transactions.slice(-10).reverse().forEach(transaction => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td>${new Date(transaction.date).toLocaleDateString()}</td>
            <td>${transaction.description}</td>
            <td>${transaction.category}</td>
            <td class="${transaction.type}">${formatCurrency(Math.abs(transaction.amount))}</td>
            <td>${transaction.type === 'income' ? '💰' : '💸'} ${transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}</td>
        `;
    });
}

// Update investment table
function updateInvestmentTable(investments) {
    const tbody = document.getElementById('investment-table-body');
    tbody.innerHTML = '';
    
    investments.forEach(investment => {
        const gainLoss = investment.current_value - investment.amount_invested;
        const returnPercent = ((gainLoss / investment.amount_invested) * 100).toFixed(2);
        
        const row = tbody.insertRow();
        row.innerHTML = `
            <td>${investment.name}</td>
            <td>${investment.type.replace('-', ' ').toUpperCase()}</td>
            <td>${formatCurrency(investment.amount_invested)}</td>
            <td>${formatCurrency(investment.current_value)}</td>
            <td class="${gainLoss >= 0 ? 'income' : 'expense'}">${formatCurrency(gainLoss)}</td>
            <td class="${gainLoss >= 0 ? 'income' : 'expense'}">${returnPercent}%</td>
        `;
    });
}

// Update budget overview
function updateBudgetOverview(budgets) {
    const overview = document.getElementById('budget-overview');
    overview.innerHTML = '';
    
    let totalBudget = 0;
    let totalSpent = 0;
    
    budgets.forEach(budget => {
        totalBudget += budget.amount;
        
        const budgetItem = document.createElement('div');
        budgetItem.className = 'budget-item';
        budgetItem.innerHTML = `
            <div>
                <strong>${budget.category.charAt(0).toUpperCase() + budget.category.slice(1)}</strong>
                <br>
                <small>${formatCurrency(budget.amount)}</small>
            </div>
            <div>
                <div class="budget-progress">
                    <div class="budget-progress-fill" style="width: 0%"></div>
                </div>
            </div>
        `;
        overview.appendChild(budgetItem);
    });
    
    // Update budget summary cards
    document.getElementById('total-budget').textContent = formatCurrency(totalBudget);
    document.getElementById('total-spent').textContent = formatCurrency(totalSpent);
    document.getElementById('remaining-budget').textContent = formatCurrency(totalBudget - totalSpent);
}

// Financial chart (simplified version using canvas)
function drawFinancialChart() {
    const canvas = document.getElementById('financialChart');
    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Get monthly data for last 6 months
    const monthlyData = [];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonth = new Date().getMonth();
    
    for (let i = 5; i >= 0; i--) {
        const monthIndex = (currentMonth - i + 12) % 12;
        const monthTransactions = transactions.filter(t => new Date(t.date).getMonth() === monthIndex);
        
        const income = monthTransactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);
        
        const expenses = monthTransactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + Math.abs(t.amount), 0);
        
        monthlyData.push({
            month: months[monthIndex],
            income,
            expenses
        });
    }
    
    // Draw chart
    const chartWidth = canvas.width - 80;
    const chartHeight = canvas.height - 60;
    const barWidth = chartWidth / (monthlyData.length * 2);
    
    // Find max value for scaling
    const maxValue = Math.max(
        ...monthlyData.map(d => Math.max(d.income, d.expenses))
    );
    
    if (maxValue > 0) {
        monthlyData.forEach((data, index) => {
            const x = 40 + index * barWidth * 2;
            
            // Income bar (green)
            const incomeHeight = (data.income / maxValue) * chartHeight;
            ctx.fillStyle = '#4CAF50';
            ctx.fillRect(x, canvas.height - 30 - incomeHeight, barWidth * 0.8, incomeHeight);
            
            // Expense bar (red)
            const expenseHeight = (data.expenses / maxValue) * chartHeight;
            ctx.fillStyle = '#f44336';
            ctx.fillRect(x + barWidth, canvas.height - 30 - expenseHeight, barWidth * 0.8, expenseHeight);
            
            // Month label
            ctx.fillStyle = '#333';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(data.month, x + barWidth, canvas.height - 10);
        });
        
        // Legend
        ctx.fillStyle = '#4CAF50';
        ctx.fillRect(20, 20, 15, 15);
        ctx.fillStyle = '#333';
        ctx.font = '12px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('Income', 40, 32);
        
        ctx.fillStyle = '#f44336';
        ctx.fillRect(100, 20, 15, 15);
        ctx.fillStyle = '#333';
        ctx.fillText('Expenses', 120, 32);
    } else {
        // No data message
        ctx.fillStyle = '#666';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('No transaction data available', canvas.width / 2, canvas.height / 2);
    }
}

// Export functionality
function exportData() {
    const data = {
        transactions,
        investments,
        budgets,
        currentBalance,
        exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financial_data_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

// Import functionality
function importData(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = JSON.parse(e.target.result);
                transactions = data.transactions || [];
                investments = data.investments || [];
                budgets = data.budgets || {};
                currentBalance = data.currentBalance || 0;
                
                // Update all displays
                updateTransactionTable();
                updateInvestmentTable();
                updateDashboard();
                updateBudgetOverview();
                drawFinancialChart();
                
                alert('Data imported successfully!');
            } catch (error) {
                alert('Error importing data. Please check the file format.');
            }
        };
        reader.readAsText(file);
    }
}

// Generate financial report
function generateReport() {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const monthlyIncome = transactions
        .filter(t => t.type === 'income' && new Date(t.date).getMonth() === currentMonth)
        .reduce((sum, t) => sum + t.amount, 0);
    
    const monthlyExpenses = transactions
        .filter(t => t.type === 'expense' && new Date(t.date).getMonth() === currentMonth)
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    
    const totalInvestments = investments.reduce((sum, inv) => sum + inv.current, 0);
    
    const report = `
FINANCIAL REPORT - ${new Date().toLocaleDateString()}
================================================

CURRENT FINANCIAL STATUS:
- Current Balance: ${formatCurrency(currentBalance)}
- Total Investments: ${formatCurrency(totalInvestments)}
- Net Worth: ${formatCurrency(currentBalance + totalInvestments)}

MONTHLY SUMMARY (${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}):
- Total Income: ${formatCurrency(monthlyIncome)}
- Total Expenses: ${formatCurrency(monthlyExpenses)}
- Net Savings: ${formatCurrency(monthlyIncome - monthlyExpenses)}
- Savings Rate: ${monthlyIncome > 0 ? ((monthlyIncome - monthlyExpenses) / monthlyIncome * 100).toFixed(2) : 0}%

INVESTMENT PORTFOLIO:
${investments.map(inv => {
const gain = inv.current - inv.invested;
const returnPercent = ((gain / inv.invested) * 100).toFixed(2);
return `- ${inv.name}: ${formatCurrency(inv.current)} (${returnPercent}% return)`;
}).join('\n')}

BUDGET ANALYSIS:
${Object.keys(budgets).map(category => {
const budgetAmount = budgets[category];
const spent = transactions
 .filter(t => t.category === category && t.type === 'expense' && new Date(t.date).getMonth() === currentMonth)
 .reduce((sum, t) => sum + Math.abs(t.amount), 0);
const percentage = ((spent / budgetAmount) * 100).toFixed(1);
return `- ${category.charAt(0).toUpperCase() + category.slice(1)}: ${formatCurrency(spent)}/${formatCurrency(budgetAmount)} (${percentage}%)`;
}).join('\n')}

Generated on: ${new Date().toLocaleString()}
    `;
    
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financial_report_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
}

// Add export/import buttons to dashboard
document.addEventListener('DOMContentLoaded', function() {
    const dashboard = document.getElementById('dashboard');
    const actionsDiv = document.createElement('div');
    actionsDiv.style.cssText = 'margin-top: 20px; text-align: center; gap: 10px; display: flex; justify-content: center; flex-wrap: wrap;';
    actionsDiv.innerHTML = `
        <button class="btn" onclick="generateReport()">📊 Generate Report</button>
        <button class="btn btn-secondary" onclick="exportData()">💾 Export Data</button>
        <input type="file" id="import-file" accept=".json" style="display: none;" onchange="importData(event)">
        <button class="btn btn-secondary" onclick="document.getElementById('import-file').click()">📁 Import Data</button>
    `;
    dashboard.appendChild(actionsDiv);
    
    // Initial updates
    updateDashboard();
    drawFinancialChart();
    
    // Update chart when window resizes
    window.addEventListener('resize', drawFinancialChart);
});

// Auto-save to prevent data loss (using memory only as per restrictions)
let autoSaveInterval;
function startAutoSave() {
    // Clear existing interval
    if (autoSaveInterval) {
        clearInterval(autoSaveInterval);
    }
    
    // Auto-save every 30 seconds (in memory only)
    autoSaveInterval = setInterval(() => {
        // In a real application, this would save to a server or local storage
        console.log('Auto-save triggered (in-memory only)');
    }, 30000);
}

// Smart financial insights
function getFinancialInsights() {
    const insights = [];
    
    // Check savings rate
    const currentMonth = new Date().getMonth();
    const monthlyIncome = transactions
        .filter(t => t.type === 'income' && new Date(t.date).getMonth() === currentMonth)
        .reduce((sum, t) => sum + t.amount, 0);
    
    const monthlyExpenses = transactions
        .filter(t => t.type === 'expense' && new Date(t.date).getMonth() === currentMonth)
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    
    const savingsRate = monthlyIncome > 0 ? ((monthlyIncome - monthlyExpenses) / monthlyIncome * 100) : 0;
    
    if (savingsRate < 20) {
        insights.push("💡 Consider increasing your savings rate. Financial experts recommend saving at least 20% of your income.");
    }
    
    // Check emergency fund
    const totalInvestments = investments.reduce((sum, inv) => sum + inv.current, 0);
    const emergencyFund = currentBalance;
    const monthlyExpenseAvg = monthlyExpenses;
    
    if (emergencyFund < monthlyExpenseAvg * 3) {
        insights.push("🚨 Build an emergency fund covering 3-6 months of expenses before investing heavily.");
    }
    
    // Check investment diversification
    const investmentTypes = [...new Set(investments.map(inv => inv.type))];
    if (investments.length > 0 && investmentTypes.length < 3) {
        insights.push("📈 Consider diversifying your investment portfolio across different asset classes.");
    }
    
    // Budget overspending alerts
    Object.keys(budgets).forEach(category => {
        const spent = transactions
            .filter(t => t.category === category && t.type === 'expense' && new Date(t.date).getMonth() === currentMonth)
            .reduce((sum, t) => sum + Math.abs(t.amount), 0);
        
        if (spent > budgets[category]) {
            insights.push(`⚠️ You've exceeded your ${category} budget by ${formatCurrency(spent - budgets[category])}`);
        }
    });
    
    return insights;
}

// Add insights to dashboard
function updateInsights() {
    const insights = getFinancialInsights();
    let insightsHTML = '<div class="card" style="border-left-color: #ff9800;"><h3>💡 Financial Insights</h3>';
    
    if (insights.length > 0) {
        insightsHTML += '<ul style="margin: 10px 0; padding-left: 20px;">';
        insights.forEach(insight => {
            insightsHTML += `<li style="margin: 5px 0; color: #666;">${insight}</li>`;
        });
        insightsHTML += '</ul>';
    } else {
        insightsHTML += '<p style="color: #4CAF50;">🎉 Great job! Your finances look healthy.</p>';
    }
    
    insightsHTML += '</div>';
    
    // Add insights to dashboard
    const dashboard = document.getElementById('dashboard');
    const existingInsights = dashboard.querySelector('.insights-card');
    if (existingInsights) {
        existingInsights.remove();
    }
    
    const insightsElement = document.createElement('div');
    insightsElement.className = 'insights-card';
    insightsElement.innerHTML = insightsHTML;
    dashboard.appendChild(insightsElement);
}

// Enhanced dashboard update function
function updateDashboard() {
    document.getElementById('current-balance').textContent = formatCurrency(currentBalance);
    
    const totalInvestments = investments.reduce((sum, inv) => sum + inv.current, 0);
    document.getElementById('total-investments').textContent = formatCurrency(totalInvestments);
    
    const currentMonth = new Date().getMonth();
    const monthlyExpenses = transactions
        .filter(t => t.type === 'expense' && new Date(t.date).getMonth() === currentMonth)
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    document.getElementById('monthly-expenses').textContent = formatCurrency(monthlyExpenses);
    
    // Update chart and insights
    setTimeout(() => {
        drawFinancialChart();
        updateInsights();
    }, 100);
}

// Initialize auto-save
startAutoSave();



