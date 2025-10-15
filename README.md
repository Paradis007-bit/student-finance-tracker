# Student Finance Tracker

A responsive, accessible **Finance Tracker** web app built with **vanilla HTML, CSS, and JavaScript**.  
Track your budgets, transactions, search with regex, and view live stats. All data persists in `localStorage` and can be imported/exported as JSON.

---

## 🌟 Features

- **Add/Edit/Delete Transactions**  
- **Regex Validation** on all fields  
- **Live Regex Search** with highlighted matches  
- **Dashboard Stats**: total transactions, sum, top category, remaining cap/overage  
- **Import/Export JSON** for backup and sharing  
- **Settings**: base currency configuration  
- **Accessible & Responsive**: keyboard navigation, ARIA live regions, mobile-first layout  

---

## 📦 Data Model

Each record includes:

```json
{
  "id": "txn_001",
  "description": "Lunch at cafeteria",
  "amount": 12.50,
  "category": "Food",
  "date": "2025-09-01",
  "createdAt": "2025-09-01T12:00:00Z",
  "updatedAt": "2025-09-01T12:00:00Z"
}
