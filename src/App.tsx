import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  Minus,
  Plus,
  Trash2,
  Calendar,
  X,
  Pencil,
  Plus as PlusIcon
} from 'lucide-react';

type SalesFilter = '어제' | '오늘' | '이번 주' | '이번 달' | '직접 선택';

interface Category {
  id: number;
  name: string;
  enabled: boolean;
  inOrders?: boolean;
}

interface MenuItem {
  id: number;
  name: string;
  salesPrice: number;
  purchasePrice: number;
  category: string;
  quantity?: number;
  remainingStock: number;
  totalStock: number;
}

interface Order {
  id: number;
  items: Array<{
    id: number;
    name: string;
    price: number;
    quantity: number;
  }>;
  totalAmount: number;
  discount: number;
  finalAmount: number;
  paymentMethod: string;
  timestamp: Date;
  isExpense?: boolean;
  purchaseTotal?: number;
}

interface Expense {
  id: number;
  description: string;
  amount: number;
}

function App() {
  // ===== 주문 화면 상태 =====
  const [activeCategory, setActiveCategory] = useState('식품');
  const [currentPage, setCurrentPage] = useState(1);
  const [orderItems, setOrderItems] = useState<MenuItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [discountAmount, setDiscountAmount] = useState('');
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDescription, setExpenseDescription] = useState('');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<number | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<number | null>(null);
  const [showDayDetailsModal, setShowDayDetailsModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // ===== 카테고리 & 대시보드 상태 =====
  const [productCategories, setProductCategories] = useState<Category[]>([
    { id: 1, name: '식품', enabled: true, inOrders: true },
    { id: 2, name: '채소', enabled: true, inOrders: true },
    { id: 3, name: '대용량 상품', enabled: true, inOrders: true },
  ]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingText, setEditingText] = useState<string>('');

  // ===== 대시보드 필터 상태 =====
  const [salesFilter, setSalesFilter] = useState<SalesFilter>('오늘');

  // 상단 탭: 주문 / 현황
  const [activeView, setActiveView] = useState<'order' | 'dashboard'>('order');

  // 대시보드 탭: 매출현황 / 매출달력 / '상품'(추가) / '카테고리'
  const [dashboardTab, setDashboardTab] = useState<'매출현황' | '매출달력' | '상품' | '카테고리'>('매출현황');
  const [completedOrders, setCompletedOrders] = useState<Order[]>([]);

  // ===== 주문 탭에서 사용하는 메뉴 아이템 =====
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);

  // 실시간 현재 시간 상태 및 업데이트 (주문 리스트 상단 헤더에 사용)
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

   // 툴팁 상태 (시간대별 매출 그래프에 사용)
   const [tooltip, setTooltip] = useState<{ visible: boolean; x: number; y: number; amount: number }>({
    visible: false,
    x: 0,
    y: 0,
    amount: 0,
  });
  const handleBarClick = (e: React.MouseEvent<HTMLDivElement>, data: { hour: number; amount: number }) => {
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    setTooltip({
      visible: true,
      x: rect.left + rect.width / 2,
      y: rect.top - 10,
      amount: data.amount,
    });
  };
  useEffect(() => {
    if (tooltip.visible) {
      const timer = setTimeout(() => setTooltip(prev => ({ ...prev, visible: false })), 3000);
      return () => clearTimeout(timer);
    }
  }, [tooltip.visible]);


  // 실제 API에서 데이터를 받아오도록 useEffect 사용
  useEffect(() => {
    fetch('/menuItems.json')
      .then(res => res.json())
      .then((data: MenuItem[]) => {
        setMenuItems(data);
      })
      .catch(error => {
        console.error(error);
        // 에러 발생 시 더미 데이터 사용
        setMenuItems(
          productCategories.flatMap((category, categoryIndex) =>
            Array.from({ length: 100 }, (_, i) => ({
              id: categoryIndex * 100 + i + 1,
              name: `${category.name} 상품 ${i + 1}`,
              purchasePrice: (Math.floor(Math.random() * 10) + 1) * 1000,
              salesPrice: (Math.floor(Math.random() * 10) + 1) * 1500,
              category: category.name,
              remainingStock: Math.floor(Math.random() * 10) + 1,
              totalStock: 10,
            }))
          )
        );
      });
  }, []);

  // 주문 탭: 현재 카테고리에 따른 필터
  const filteredItems = menuItems.filter(item => item.category === activeCategory);
  const itemsPerPage = 24;
  const currentItems = filteredItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);

  // ===== 주문 처리 함수 =====
  const addToOrder = (item: MenuItem) => {
    if (expenses.length > 0) {
      showToastMessage("지출이 등록된 상태에서는 상품을 추가할 수 없습니다");
      return;
    }
  
    // 재고가 없으면 추가하지 않음
    if (item.remainingStock <= 0) {
      showToastMessage("재고가 부족합니다");
      return;
    }
  
    setOrderItems(prev => {
      const existingItem = prev.find(orderItem => orderItem.id === item.id);
      if (existingItem) {
        return prev.map(orderItem =>
          orderItem.id === item.id
            ? { ...orderItem, quantity: (orderItem.quantity || 1) + 1 }
            : orderItem
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };
  
  const updateQuantity = (id: number, change: number) => {
    setOrderItems(prev =>
      prev.map(item => {
        if (item.id === id) {
          const newQuantity = Math.max(1, (item.quantity || 1) + change);
          return { ...item, quantity: newQuantity };
        }
        return item;
      })
    );
  };

  const removeOrderItem = (id: number) => {
    setOrderItems(prev => prev.filter(item => item.id !== id));
    showToastMessage("상품이 삭제되었습니다");
  };

  const processOrder = (paymentMethod: string) => {
    if (expenses.length > 0) {
      const totalExpenseAmount = expenses.reduce((sum, expense) => sum + expense.amount, 0);
      const expenseOrder: Order = {
        id: Date.now(),
        items: [],
        totalAmount: -totalExpenseAmount,
        discount: 0,
        finalAmount: -totalExpenseAmount,
        paymentMethod: '지출',
        timestamp: new Date(),
        isExpense: true
      };
      setCompletedOrders(prev => [...prev, expenseOrder]);
      setExpenses([]);
      showToastMessage("지출이 등록되었습니다");
    } else {
      const subtotal = orderItems.reduce(
        (sum, item) => sum + ((item.salesPrice ?? 0) * (item.quantity || 1)),
        0
      );
      const total = Math.max(0, subtotal - discount);
      const purchaseTotal = orderItems.reduce(
        (sum, item) => sum + item.purchasePrice * (item.quantity || 1),
        0
      );

      const newOrder: Order = {
        id: Date.now(),
        items: orderItems.map(item => ({
          id: item.id,
          name: item.name,
          price: (item.salesPrice ?? 0),
          quantity: item.quantity || 1
        })),
        totalAmount: subtotal,
        discount,
        finalAmount: total,
        paymentMethod,
        timestamp: new Date(),
        purchaseTotal,
      };

      // 실제 주문(결제) 시에만, 주문된 수량만큼 재고 감소
      setMenuItems(prev =>
        prev.map(prod => {
          const orderItem = orderItems.find(item => item.id === prod.id);
          if (orderItem) {
            return { ...prod, remainingStock: Math.max(prod.remainingStock - (orderItem.quantity || 0), 0) };
          }
          return prod;
        })
      );
      
      setCompletedOrders(prev => [...prev, newOrder]);
      setOrderItems([]);
      setDiscount(0);
      showToastMessage("주문이 완료되었습니다");
    }
  };

  // ===== 매출/통계 관련 =====
  // 오늘 날짜를 기준으로 완료된 주문 필터링
const today = new Date();
today.setHours(0, 0, 0, 0);
const todayOrders = completedOrders.filter(order => {
  const orderDate = new Date(order.timestamp);
  orderDate.setHours(0, 0, 0, 0);
  return orderDate.getTime() === today.getTime();
});
const todaySales = todayOrders
  .filter(order => !order.isExpense)
  .reduce((sum, order) => sum + order.finalAmount, 0);


  // 필터에 따른 주문 데이터 필터링 함수
  const getFilteredOrders = (): Order[] => {
    if (salesFilter === '어제' || salesFilter === '오늘' || salesFilter === '직접 선택') {
      const compareDate = new Date(selectedDate);
      compareDate.setHours(0, 0, 0, 0);
      return completedOrders.filter(order => {
        const orderDate = new Date(order.timestamp);
        orderDate.setHours(0, 0, 0, 0);
        return orderDate.getTime() === compareDate.getTime();
      });
    } else if (salesFilter === '이번 주') {
      const compareDate = new Date(selectedDate);
      const day = compareDate.getDay(); // Sunday = 0, Saturday = 6
      const startOfWeek = new Date(compareDate);
      startOfWeek.setDate(compareDate.getDate() - day);
      startOfWeek.setHours(0, 0, 0, 0);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);
      return completedOrders.filter(order => {
        const orderDate = new Date(order.timestamp);
        return orderDate >= startOfWeek && orderDate <= endOfWeek;
      });
    } else if (salesFilter === '이번 달') {
      const compareDate = new Date(selectedDate);
      const startOfMonth = new Date(compareDate.getFullYear(), compareDate.getMonth(), 1);
      const endOfMonth = new Date(compareDate.getFullYear(), compareDate.getMonth() + 1, 0);
      endOfMonth.setHours(23, 59, 59, 999);
      return completedOrders.filter(order => {
        const orderDate = new Date(order.timestamp);
        return orderDate >= startOfMonth && orderDate <= endOfMonth;
      });
    }
    return [];
  };

  const filteredOrders = getFilteredOrders();
  const dashboardSales = filteredOrders
  .filter(order => !order.isExpense)
  .reduce((sum, order) => sum + order.finalAmount, 0);

  const headerSales = salesFilter === '오늘' ? todaySales : dashboardSales;


  const dashboardPurchases = filteredOrders
  .filter(order => !order.isExpense)
  .reduce((sum, order) => sum + (order.purchaseTotal ?? 0), 0);
  const dashboardOtherExpenses = filteredOrders
  .filter(order => order.isExpense)
  .reduce((sum, order) => sum - order.finalAmount, 0);
  const dashboardProfit = dashboardSales - dashboardPurchases - dashboardOtherExpenses;

  


  const getProductRankings = () => {
    const productCounts = new Map<string, number>();
    filteredOrders
      .filter(order => !order.isExpense)
      .forEach(order => {
        order.items.forEach(item => {
          const currentCount = productCounts.get(item.name) || 0;
          productCounts.set(item.name, currentCount + item.quantity);
        });
      });
    return Array.from(productCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  };
  

  const hourlySalesData = React.useMemo(() => {
    const data = Array.from({ length: 24 }, (_, index) => ({
      hour: index,
      amount: 0
    }));
    
    filteredOrders.forEach(order => {
      if (!order.timestamp) return;
      const orderDate = new Date(order.timestamp);
      const hour = orderDate.getHours();
      if (hour >= 0 && hour < 24 && !order.isExpense) {
        data[hour].amount += Number(order.finalAmount || 0);
      }
    });
    
    return data;
  }, [filteredOrders]);
  

  const calculateInventoryRate = () => {
    const filteredOrders = getFilteredOrders();
    if (filteredOrders.length === 0) return 0;
    const totalOrderedItems = filteredOrders
      .filter(order => !order.isExpense)
      .reduce((sum, order) => sum + order.items.length, 0);
    const totalMenuItems = menuItems.length;
    return Math.round((totalOrderedItems / totalMenuItems) * 100);
  };
  

    // ===== 대시보드 필터 상태 및 핸들러 =====
    const handleFilterChange = (filter: SalesFilter) => {
      setSalesFilter(filter);
      if (filter === '오늘') {
        setSelectedDate(new Date());
      } else if (filter === '어제') {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        setSelectedDate(yesterday);
      }
        // '이번 주'와 '이번 달'은 별도 로직(위의 getFilteredOrders 함수 내에서 처리)
    };
    const handleDateChange = (newDate: Date) => {
      setSelectedDate(newDate);
      setSalesFilter('직접 선택');
    };

  // ===== 카테고리 관리 함수 =====
  const handleToggle = (id: number) => {
    setProductCategories(categories =>
      categories.map(cat =>
        cat.id === id ? { ...cat, enabled: !cat.enabled } : cat
      )
    );
  };

  const handleAddCategory = () => {
    if (newCategoryName.trim()) {
      setProductCategories(prev => [
        ...prev,
        {
          id: prev.length + 1,
          name: newCategoryName,
          enabled: true,
          inOrders: false
        }
      ]);
      setNewCategoryName('');
      setIsModalOpen(false);
    }
  };

  const handleEditClick = (category: Category) => {
    setEditingCategory(category);
    setEditingText(category.name);
  };

  const handleEditSave = (category: Category) => {
    if (editingText.trim()) {
      setProductCategories(categories =>
        categories.map(cat =>
          cat.id === category.id ? { ...cat, name: editingText.trim() } : cat
        )
      );
      setEditingCategory(null);
      setEditingText('');
    }
  };

  const handleEditCancel = () => {
    setEditingCategory(null);
    setEditingText('');
  };

  const handleDeleteClick = (category: Category) => {
    setSelectedCategory(category);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (selectedCategory) {
      setProductCategories(categories =>
        categories.filter(cat => cat.id !== selectedCategory.id)
      );
      setIsDeleteModalOpen(false);
      setSelectedCategory(null);
    }
  };

  // === 카테고리 화면 페이지네이션 ===
  const [categoryPage, setCategoryPage] = useState(1);
  const categoriesPerPage = 10;
  const totalCategoryPages = Math.ceil(productCategories.length / categoriesPerPage);
  const currentCategories = productCategories.slice(
    (categoryPage - 1) * categoriesPerPage,
    categoryPage * categoriesPerPage
  );

  // ===== 상품 관리 (대시보드 '상품' 화면) =====
  const [isProductAddModalOpen, setIsProductAddModalOpen] = useState(false);
  const [isProductDeleteModalOpen, setIsProductDeleteModalOpen] = useState(false);
  const [isProductEditModalOpen, setIsProductEditModalOpen] = useState(false);

  const [newProduct, setNewProduct] = useState({
    name: '',
    category: '',
    price: '',
    salesPrice: '',    
    salesStock: '',
  });
  const [editProduct, setEditProduct] = useState({
    name: '',
    category: '',
    purchasePrice: '',
    salesPrice: '',
    quantity: ''
  });
  const [selectedProduct, setSelectedProduct] = useState<MenuItem | null>(null);

  const handleAddProduct = () => {
    const newItem: MenuItem = {
      id: Date.now(),
      name: newProduct.name,
      salesPrice: Number(newProduct.salesPrice),
      purchasePrice: Number(newProduct.price),
      category: newProduct.category,
      remainingStock: Number(newProduct.salesStock),
      totalStock: Number(newProduct.salesStock),
    };
    setMenuItems(prev => [...prev, newItem]);
    setNewProduct({ name: '', category: '', price: '' ,salesPrice: '',salesStock: '',});
    setIsProductAddModalOpen(false);
  };

  const handleEditClickProduct = (item: MenuItem) => {
    setSelectedProduct(item);
    setEditProduct({
      name: item.name,
      category: item.category,
      purchasePrice: item.purchasePrice.toString(),
      salesPrice: item.salesPrice.toString(),
      quantity: item.quantity ? item.quantity.toString() : ''
    });
    setIsProductEditModalOpen(true);
  };

  const handleEditProduct = () => {
    if (selectedProduct) {
      const updated: MenuItem = {
        ...selectedProduct,
        name: editProduct.name,
        category: editProduct.category,
        salesPrice: Number(editProduct.salesPrice)
      };
      setMenuItems(prev => prev.map(i => (i.id === selectedProduct.id ? updated : i)));
      setIsProductEditModalOpen(false);
      setSelectedProduct(null);
    }
  };
  
  const handleDeleteProduct = () => {
    if (selectedProduct) {
      setMenuItems(prev => prev.filter(i => i.id !== selectedProduct.id));
      setIsProductDeleteModalOpen(false);
      setSelectedProduct(null);
    }
  };

  // ===== 유틸 =====
  const showToastMessage = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  // 주문 탭 총액 계산
  const subtotal = orderItems.reduce((sum, item) =>
    sum + ((item.salesPrice ?? 0) * (item.quantity || 1)), 0
  );  
  const total = Math.max(0, subtotal - discount);
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* ===== Header ===== */}
      <div className="bg-slate-800 text-white p-4 flex justify-center">
        <div className="flex space-x-8">
          <button
            className={`px-6 py-2 ${activeView === 'order' ? 'bg-slate-700 rounded-md' : ''}`}
            onClick={() => setActiveView('order')}
          >
            주문
          </button>
          <button
            className={`px-6 py-2 ${activeView === 'dashboard' ? 'bg-slate-700 rounded-md' : ''}`}
            onClick={() => setActiveView('dashboard')}
          >
            현황
          </button>
        </div>
      </div>

      {/* ===== Main Content ===== */}
      <div className="flex-1 flex">
        {activeView === 'order' ? (
          // ================= Order View =================
          <div className="flex flex-1">
            {/* 왼쪽 메뉴 영역 */}
            <div className="w-3/4 flex flex-col">
              {/* 카테고리 탭 */}
              <div className="flex overflow-x-auto bg-white border-b">
                {productCategories
                  .filter(category => category.enabled)
                  .map(category => (
                    <button
                      key={category.id}
                      className={`px-6 py-4 whitespace-nowrap font-medium ${
                        activeCategory === category.name
                          ? 'text-blue-600 border-b-2 border-blue-600'
                          : 'text-gray-500 hover:text-gray-700'
                      } ${expenses.length > 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                      onClick={() => {
                        if (expenses.length === 0) {
                          setActiveCategory(category.name);
                          setCurrentPage(1);
                        }
                      }}
                      disabled={expenses.length > 0}
                    >
                      {category.name}
                    </button>
                  ))}
              </div>

              {/* ▼▼▼ 주문 탭 - 메뉴 그리드 (절대배치) ▼▼▼ */}
              <div className="grid grid-cols-6 gap-[12px] p-4 overflow-y-auto flex-1">
                {currentItems.map(item => {
                  const ratio = item.totalStock > 0
                    ? item.remainingStock / item.totalStock
                    : 0;

                  return (
                    <button
                      key={item.id}
                      className="bg-white shadow border rounded-lg relative overflow-hidden"
                      style={{ width: '137px', height: '137px', borderWidth: '1px' }}
                      onClick={() => addToOrder(item)}
                      disabled={expenses.length > 0}
                    >
                      {/* 상품명 */}
                      <div
                        className="absolute text-left whitespace-nowrap text-sm font-medium"
                        style={{ top: '8px', left: '8px', width: '121px', height: '24px' }}
                      >
                        {item.name}
                      </div>

                      {/* 가로 재고 바 */}
                      <div
                        className="absolute text-left bg-gray-200 rounded-full"
                        style={{ top: '73px', left: '8px', width: '121px', height: '8px' }}
                      >
                        <div
                          className="bg-blue-500 rounded-full h-full"
                          style={{
                            width: `${item.totalStock > 0 ? ((item.remainingStock / item.totalStock) * 100).toFixed(0) : 0}%`
                          }}
                        />
                      </div>

                      {/* 남은 재고 개수 */}
                      <div
                        className="absolute text-left text-xs text-red-500 whitespace-nowrap"
                        style={{ top: '85px', left: '8px', width: '121px', height: '20px' }}
                      >
                        {item.remainingStock}개 남음
                      </div>

                      {/* 가격 */}
                      <div
                        className="absolute text-left text-sm text-gray-700 whitespace-nowrap"
                        style={{ top: '107px', left: '8px', width: '121px', height: '22px' }}
                      >
                        {(item.salesPrice ?? 0).toLocaleString()}원
                      </div>
                    </button>
                  );
                })}
              </div>
              {/* ▲▲▲ 주문 탭 - 메뉴 그리드 (절대배치) ▲▲▲ */}

              {/* 주문 하단 영역: 할인/지출 + 페이지네이션 */}
              <div className="bg-white p-4 border-t flex justify-between items-center">
                <div className="flex space-x-2">
                  <button
                    className={`px-4 py-2 rounded-md ${
                      orderItems.length > 0
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                    onClick={() => setShowDiscountModal(true)}
                    disabled={orderItems.length === 0}
                  >
                    할인 적용
                  </button>
                  <button
                    className={`px-4 py-2 rounded-md ${
                      orderItems.length === 0
                        ? 'bg-[#FFFBE6] text-[#FF8F1F] border border-[#EEEEEE]'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                    onClick={() => setShowExpenseModal(true)}
                    disabled={orderItems.length > 0}
                  >
                    기타 지출
                  </button>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    className={`w-8 h-8 flex items-center justify-center border rounded-md ${
                      expenses.length > 0 ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1 || expenses.length > 0}
                  >
                    &lt;
                  </button>
                  <span className="px-2">{currentPage}</span>
                  <button
                    className={`w-8 h-8 flex items-center justify-center border rounded-md ${
                      expenses.length > 0 ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages || expenses.length > 0}
                  >
                    &gt;
                  </button>
                </div>
              </div>
            </div>

            {/* 오른쪽 주문 내역 영역 */}
            <div className="w-1/4 bg-white border-l flex flex-col">
              <div className="p-3 border-b flex justify-between items-center bg-gray-50">
                <span>{format(currentTime, 'yyyy-MM-dd HH:mm:ss')}</span>
                <span className="font-bold">{headerSales.toLocaleString()}원</span>
              </div>
              <div className="flex-1 overflow-y-auto">
                {orderItems.length === 0 ? (
                  expenses.length > 0 ? (
                    expenses.map(expense => (
                      <div key={expense.id} className="p-3 border-b bg-blue-50">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center">
                            <span className="font-medium">{expense.description}</span>
                          </div>
                          <button
                            className="text-red-500"
                            onClick={() => {
                              setExpenseToDelete(expense.id);
                              setShowDeleteConfirmation(true);
                            }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        <div className="flex justify-end">
                          <span className="text-right">(-) {expense.amount.toLocaleString()}원</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-gray-500">주문서가 비어있습니다</p>
                    </div>
                  )
                ) : (
                  orderItems.map(item => (
                    <div key={item.id} className="p-3 border-b">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <button className="p-1 rounded bg-gray-100" onClick={() => updateQuantity(item.id, -1)}>
                            <Minus size={16} />
                          </button>
                          <span>{item.quantity || 1}</span>
                          <button className="p-1 rounded bg-gray-100" onClick={() => updateQuantity(item.id, 1)}>
                            <Plus size={16} />
                          </button>
                        </div>
                        <button
                          className="text-red-500"
                          onClick={() => {
                            setItemToDelete(item.id);
                            setShowDeleteConfirmation(true);
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <div className="flex justify-between">
                        <span className="whitespace-nowrap">{item.name}</span>
                        <span className="whitespace-nowrap">{(((item.salesPrice ?? 0)) * (item.quantity || 1)).toLocaleString()}원</span>
                      </div>
                    </div>
                  ))
                )}
                {discount > 0 && (
                  <div className="p-3 border-b text-red-500">
                    <div className="flex justify-between">
                      <span>할인</span>
                      <span>-{discount.toLocaleString()}원</span>
                    </div>
                  </div>
                )}
              </div>
              <div className="border-t p-3">
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <button
                    className={`bg-blue-100 text-blue-700 py-2 rounded-md ${expenses.length > 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={() => processOrder('현금')}
                    disabled={orderItems.length === 0 || expenses.length > 0}
                  >
                    현금
                  </button>
                  <button
                    className={`bg-blue-100 text-blue-700 py-2 rounded-md ${expenses.length > 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={() => processOrder('계좌이체')}
                    disabled={orderItems.length === 0 || expenses.length > 0}
                  >
                    계좌이체
                  </button>
                  <button
                    className={`bg-blue-100 text-blue-700 py-2 rounded-md ${expenses.length > 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={() => processOrder('외상')}
                    disabled={orderItems.length === 0 || expenses.length > 0}
                  >
                    외상
                  </button>
                </div>
                <button
                  className="w-full bg-blue-600 text-white py-3 rounded-md"
                  onClick={() => processOrder('카드')}
                  disabled={orderItems.length === 0 && expenses.length === 0}
                >
                  {orderItems.length === 0 && expenses.length > 0
                    ? `(-) ${totalExpenses.toLocaleString()}원 지출 등록`
                    : `${(subtotal - discount).toLocaleString()}원 결제`}
                </button>
              </div>
            </div>
          </div>
        ) : (
          // ================= Dashboard View =================
          <div className="flex flex-1">
            <div className="w-64 bg-white border-r">
              <div className="p-4">
                <div className="font-medium mb-2">현황</div>
                <ul className="space-y-2">
                  <li
                    className={`cursor-pointer ${dashboardTab === '매출현황' ? 'text-blue-600' : 'text-gray-600'}`}
                    onClick={() => setDashboardTab('매출현황')}
                  >
                    매출현황
                  </li>
                  <li
                    className={`cursor-pointer ${dashboardTab === '매출달력' ? 'text-blue-600' : 'text-gray-600'}`}
                    onClick={() => setDashboardTab('매출달력')}
                  >
                    매출달력
                  </li>
                  <li>
                    <div className="font-medium">상품 관리</div>
                    <ul className="ml-4 mt-2 space-y-2">
                      <li
                        className={`cursor-pointer ${dashboardTab === '상품' ? 'text-blue-600' : 'text-gray-600'}`}
                        onClick={() => setDashboardTab('상품')}
                      >
                        상품
                      </li>
                      <li
                        className={`cursor-pointer ${dashboardTab === '카테고리' ? 'text-blue-600' : 'text-gray-600'}`}
                        onClick={() => setDashboardTab('카테고리')}
                      >
                        카테고리
                      </li>
                    </ul>
                  </li>
                </ul>
              </div>
            </div>

            <div className={`flex-1 p-6 ${dashboardTab === '매출달력' ? 'calendar-container' : ''}`}>
              {dashboardTab === '매출현황' && (
                <>
                  {/* 매출현황 제목 */}
                  <h1 className="text-2xl font-medium mb-4">매출현황</h1>

                  {/* 필터 UI: 어제/오늘/이번 주/이번 달 버튼 + 날짜 선택 */}
                  <div className="mb-6">
                    <div className="flex items-center space-x-3 mb-4">
                      {(['어제', '오늘', '이번 주', '이번 달'] as SalesFilter[]).map(filter => (
                        <button
                          key={filter}
                          onClick={() => handleFilterChange(filter)}
                          className={`px-4 py-2 rounded-md ${
                            salesFilter === filter
                              ? 'bg-blue-600 text-white'
                              : 'bg-white border border-gray-200 text-gray-600'
                          }`}
                        >
                          {filter}
                        </button>
                      ))}
                      <input
                        type="date"
                        value={format(selectedDate, 'yyyy-MM-dd')}
                        onChange={e => {
                          const newDate = new Date(e.target.value);
                          handleDateChange(newDate);
                        }}
                        className="px-4 py-2 border border-gray-200 rounded-md text-gray-600"
                      />
                    </div>
                  </div>
                  
                  {/* 카드 영역 (매출, 재고 소진율, 주문건) */}
                  <div className="grid grid-cols-3 gap-6">
                    <div className="bg-white rounded-lg shadow p-6">
                      <h2 className="text-lg font-medium mb-4">매출</h2>
                      {completedOrders.length > 0 ? (
                        <p className={`text-3xl font-bold ${dashboardSales >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
                        {dashboardSales.toLocaleString()}원
                        </p>
                      
                      ) : (
                        <p className="text-gray-500">데이터가 없습니다</p>
                      )}
                    </div>
                    <div className="bg-white rounded-lg shadow p-6">
                      <h2 className="text-lg font-medium mb-4">재고 소진율</h2>
                      {completedOrders.length > 0 ? (
                        <p className="text-3xl font-bold text-blue-600">
                          {calculateInventoryRate()}%
                        </p>
                      ) : (
                        <p className="text-gray-500">데이터가 없습니다</p>
                      )}
                    </div>
                    <div className="bg-white rounded-lg shadow p-6">
                      <h2 className="text-lg font-medium mb-4">주문건</h2>
                      {completedOrders.length > 0 ? (
                        <p className="text-3xl font-bold text-blue-600">
                          {getFilteredOrders().filter(order => !order.isExpense).length}건
                        </p>
                      ) : (
                        <p className="text-gray-500">데이터가 없습니다</p>
                      )}
                    </div>
                  </div>

                  <div className="mt-8">
                    <h2 className="text-xl font-medium mb-4">시간대별 매출현황</h2>
                    <div className="bg-white rounded-lg shadow p-6">
                      {hourlySalesData.some(data => data.amount > 0) ? (
                        <div className="relative h-80">
                          <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-gray-500 text-sm">
                            {Array.from({ length: 6 }).map((_, i) => (
                              <span key={i}>
                                {((5 - i) * 200000).toLocaleString()}원
                              </span>
                            ))}
                          </div>
                          
                          <div className="ml-20 h-full flex items-end">
                            <div className="flex-1 flex items-end justify-between h-64">
                              {hourlySalesData.map((data, index) => (
                                <div key={index} className="flex flex-col items-center">
                                  <div
                                  className={`w-8 rounded-sm ${data.amount >= 0 ? 'bg-blue-500' : 'bg-red-500'}`}
                                  style={{ 
                                    // 데이터 금액이 100만원을 초과하면 100만원으로 cap
                                    height: data.amount > 0
                                      ? `${Math.max(Math.min(data.amount, 1000000) / (1000000 / 300), 4)}px`
                                      : '0px'
                                  }}
                                ></div>
                                  <span className="text-xs text-gray-500 mt-2">{data.hour}시</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="text-gray-500 text-center py-8">데이터가 없습니다</p>
                      )}
                    </div>
                  </div>

                  <div className="mt-8">
                    <h2 className="text-xl font-medium mb-4">상품 주문건수 순위</h2>
                    <div className="bg-white rounded-lg shadow p-6">
                      {getProductRankings().length > 0 ? (
                        <div className="space-y-4">
                          {getProductRankings().map((product, index) => (
                            <div key={index} className="flex items-center justify-between px-4 py-2 hover:bg-gray-50">
                              <div className="flex items-center">
                                <span className={`w-6 h-6 rounded-full flex items-center justify-center mr-3 ${
                                  index < 3 ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                                }`}>
                                  {index + 1}
                                </span>
                                <span className="font-medium whitespace-nowrap">{product.name}</span>
                              </div>
                              <span className="text-gray-900 font-medium whitespace-nowrap">{product.count}건</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-center py-8">데이터가 없습니다</p>
                      )}
                    </div>
                  </div>
                </>
               )}

              {dashboardTab === '매출달력' && (
                <div className="flex-1 p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-medium calendar-title">매출달력</h1>
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2 text-white">
                        <button className="px-4 py-2 rounded-md bg-[#1F2A3C] hover:bg-[#313E54] flex items-center">
                          <span>오늘</span>
                        </button>
                        <button className="px-4 py-2 rounded-md bg-[#1F2A3C] hover:bg-[#313E54] flex items-center">
                          <span>이번 주</span>
                        </button>
                        <button className="px-4 py-2 rounded-md bg-[#1F2A3C] hover:bg-[#313E54] flex items-center">
                          <span>이번 달</span>
                        </button>
                      </div>
                      <div className="h-6 w-px bg-[#313E54]"></div>
                      <div className="flex items-center space-x-2">
                        <button className="flex items-center space-x-2 px-4 py-2 rounded-md bg-[#1F2A3C] hover:bg-[#313E54] text-white">
                          <span>{new Date().getFullYear()}</span>
                          <PlusIcon className="w-4 h-4" />
                        </button>
                        <button className="flex items-center space-x-2 px-4 py-2 rounded-md bg-[#1F2A3C] hover:bg-[#313E54] text-white">
                          <span>{new Date().toLocaleString('default', { month: 'short' })}</span>
                          <PlusIcon className="w-4 h-4" />
                        </button>
                        <button className="px-4 py-2 rounded-md bg-[#1F2A3C] hover:bg-[#313E54] text-white">
                          Month
                        </button>
                        <button className="px-4 py-2 rounded-md bg-[#313E354] text-gray-400">
                          Year
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg shadow p-6 calendar-wrapper">
                    <div className="grid grid-cols-7 gap-4 calendar-header">
                      {['일', '월', '화', '수', '목', '금', '토'].map(day => (
                        <div key={day} className="calendar-header-cell">
                          {day}
                        </div>
                      ))}
                      {(() => {
                        const today = new Date();
                        const year = today.getFullYear();
                        const month = today.getMonth();
                        const firstDayOfMonth = new Date(year, month, 1);
                        const lastDayOfMonth = new Date(year, month + 1, 0);
                        const firstDayOfWeek = firstDayOfMonth.getDay();
                        const daysInMonth = lastDayOfMonth.getDate();
                        const daysArray = [];

                        for (let i = 0; i < firstDayOfWeek; i++) {
                          daysArray.push(null);
                        }

                        for (let i = 1; i <= daysInMonth; i++) {
                          daysArray.push(new Date(year, month, i));
                        }

                        return daysArray.map((date, index) => {
                          if (!date) {
                            return <div key={`empty-${index}`} className="calendar-cell"></div>;
                          }

                          const isToday = date.toDateString() === today.toDateString();

                          const dayOrders = completedOrders.filter(order => {
                            const orderDate = new Date(order.timestamp);
                            orderDate.setHours(0, 0, 0, 0);
                            return orderDate.getTime() === date.getTime();
                          });
                          
                          if (dayOrders.length === 0) {
                            return (
                              <div
                                key={`date-${index}`}
                                className={`calendar-cell cursor-pointer ${isToday ? 'calendar-cell-today' : ''}`}
                              >
                                <div className="calendar-cell-date">{date.getDate()}</div>
                              </div>
                            );
                          }

                          const daySales = dayOrders
                          .filter(order => !order.isExpense)
                          .reduce((sum, order) => sum + order.finalAmount, 0);

                          const dayPurchases = dayOrders
                          .filter(order => !order.isExpense)
                          .reduce((sum, order) => sum + (order.purchaseTotal ?? 0), 0);


                          const dayOtherExpenses = dayOrders
                          .filter(order => order.isExpense)
                          .reduce((sum, order) => sum - order.finalAmount, 0);


                          const dayProfit = daySales - dayPurchases - dayOtherExpenses;


                          return (
                            <div
                              key={`date-${index}`}
                              className={`calendar-cell cursor-pointer ${isToday ? 'calendar-cell-today' : ''}`}
                              onClick={() => {
                                if (dayOrders.length > 0) {
                                  setSelectedDate(date);
                                  setShowDayDetailsModal(true);
                                }
                              }}
                            >
                              {todayOrders.length > 0 && (
                                <div className="calendar-cell-sales-container">
                                  <div className="calendar-cell-sales-positive">
                                    {daySales.toLocaleString()}원
                                  </div>
                                  <div className="calendar-cell-sales-purple">
                                    {dayPurchases.toLocaleString()}원
                                  </div>
                                  <div className="calendar-cell-sales-negative">
                                    {dayOtherExpenses.toLocaleString()}원
                                  </div>
                                  <div className="calendar-cell-sales-yellow">
                                    {dayProfit.toLocaleString()}원
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                </div>
              )}

              {dashboardTab === '상품' && (
                <div className="max-w-7xl mx-auto mt-8 p-6 bg-white rounded-lg shadow">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-semibold">상품 관리</h2>
                    <button
                      onClick={() => setIsProductAddModalOpen(true)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                    >
                      <PlusIcon size={20} />
                      상품 추가
                    </button>
                  </div>
                  {productCategories.filter(cat => cat.enabled).map(cat => {
                    const catItems = menuItems.filter(i => i.category === cat.name);
                    return (
                      <div key={cat.id} className="mb-6">
                        <h3 className="text-xl font-semibold mb-2">{cat.name}</h3>
                        {catItems.length === 0 ? (
                          <div className="text-center py-4 text-gray-500">
                            해당 카테고리에 상품이 없습니다.
                          </div>
                        ) : (
                          catItems.map(item => (
                            <div key={item.id} className="flex items-center justify-between p-4 border-b">
                              <div className="flex-1">
                                <span className="font-medium whitespace-nowrap">{item.name}</span>
                              </div>
                              <div className="flex items-center gap-4">
                                <button onClick={() => handleEditClickProduct(item)}>
                                  <Pencil className="text-gray-500 hover:text-blue-500" size={20} />
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedProduct(item);
                                    setIsProductDeleteModalOpen(true);
                                  }}
                                >
                                  <Trash2 className="text-gray-500 hover:text-red-500" size={20} />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {dashboardTab === '카테고리' && (
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-medium">카테고리</h1>
                    <button
                      onClick={() => setIsModalOpen(true)}
                      className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                    >
                      <PlusIcon className="w-5 h-5 mr-1" />
                      카테고리 추가
                    </button>
                  </div>

                  <div className="bg-white rounded-lg shadow">
                    <div className="p-6">
                      <div className="flex justify-between items-center mb-4">
                        <div className="text-lg font-medium">카테고리명</div>
                        <div className="text-lg font-medium">주문 허용 노출</div>
                      </div>
                      {currentCategories.map((category) => (
                        <div key={category.id} className="flex justify-between items-center py-4 border-t">
                          <div>{category.name}</div>
                          <div className="flex items-center space-x-4">
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={category.enabled}
                                onChange={() => handleToggle(category.id)}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                            </label>
                          </div>
                        </div>
                      ))}

                      {productCategories.length > categoriesPerPage && (
                        <div className="flex justify-end mt-4">
                          <button
                            className="px-3 py-1 border rounded mr-2"
                            onClick={() => setCategoryPage(prev => Math.max(1, prev - 1))}
                            disabled={categoryPage === 1}
                          >
                            &lt;
                          </button>
                          <span className="px-2">{categoryPage}</span>
                          <button
                            className="px-3 py-1 border rounded"
                            onClick={() => setCategoryPage(prev => Math.min(totalCategoryPages, prev + 1))}
                            disabled={categoryPage === totalCategoryPages}
                          >
                            &gt;
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>


      {/* ===== 일별 상세 매출 모달 ===== */}
      {showDayDetailsModal && selectedDate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-[600px] max-h-[80vh] overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-lg font-medium">
                {format(selectedDate, 'PPP', { locale: ko })} 매출 상세
              </h2>
              <button onClick={() => setShowDayDetailsModal(false)}>
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-sm text-gray-600 mb-2">매출</h3>
                  <p className="text-xl font-bold text-blue-600">
                    {completedOrders
                      .filter(order => {
                        const orderDate = new Date(order.timestamp);
                        return orderDate.toDateString() === selectedDate.toDateString() && !order.isExpense;
                      })
                      .reduce((sum, order) => sum + order.finalAmount, 0)
                      .toLocaleString()}원
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-sm text-gray-600 mb-2">지출</h3>
                  <p className="text-xl font-bold text-red-500">
                    {completedOrders
                      .filter(order => {
                        const orderDate = new Date(order.timestamp);
                        return orderDate.toDateString() === selectedDate.toDateString() && order.isExpense;
                      })
                      .reduce((sum, order) => sum - order.finalAmount, 0)
                      .toLocaleString()}원
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {completedOrders
                  .filter(order => {
                    const orderDate = new Date(order.timestamp);
                    return orderDate.toDateString() === selectedDate.toDateString();
                  })
                  .map(order => (
                    <div key={order.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center">
                          <span className="font-medium">{format(new Date(order.timestamp), 'HH:mm')}</span>
                          <span className="ml-2 px-2 py-1 text-xs rounded-full bg-gray-100">
                            {order.paymentMethod}
                          </span>
                        </div>
                        <span className={`font-bold ${order.isExpense ? 'text-red-500' : 'text-blue-600'}`}>
                          {order.isExpense ? '-' : ''}{Math.abs(order.finalAmount).toLocaleString()}원
                        </span>
                      </div>
                      {order.items.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {order.items.map(item => (
                            <div key={item.id} className="flex justify-between text-sm text-gray-600">
                              <span className="whitespace-nowrap">{item.name} x {item.quantity}</span>
                              <span className="whitespace-nowrap">{(item.price * item.quantity).toLocaleString()}원</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {order.discount > 0 && (
                        <div className="mt-2 text-sm text-red-500 flex justify-between">
                          <span>할인</span>
                          <span>-{order.discount.toLocaleString()}원</span>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== 할인 모달 ===== */}
      {showDiscountModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md mx-4">
            <div className="p-6">
              <h2 className="text-xl font-bold text-center mb-4">할인 금액을 입력해 주세요</h2>
              <div className="mb-4">
                <input
                  type="text"
                  className="w-full p-3 border rounded-md text-right"
                  value={
                    discountAmount
                      ? `${parseInt(discountAmount || '0').toLocaleString()} 원`
                      : '0 원'
                  }
                  readOnly
                />
              </div>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(num => (
                  <button
                    key={num}
                    className="p-3 text-lg font-medium rounded-md bg-gray-100 text-gray-800"
                    onClick={() => setDiscountAmount(prev => prev + num.toString())}
                  >
                    {num}
                  </button>
                ))}
                <button
                  className="p-3 text-lg font-medium rounded-md bg-gray-200 text-gray-800"
                  onClick={() => setDiscountAmount(prev => prev.slice(0, -1))}
                >
                  ←
                </button>
              </div>
              <div className="grid grid-cols-1 gap-3">
                <button
                  className={`w-full py-3 rounded-lg font-medium ${
                    discountAmount && parseInt(discountAmount) > 0
                      ? 'bg-blue-500 text-white hover:bg-blue-600'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                  onClick={() => {
                    setDiscount(parseInt(discountAmount || '0'));
                    setShowDiscountModal(false);
                    showToastMessage("할인이 적용되었습니다");
                  }}
                  disabled={!discountAmount || parseInt(discountAmount) <= 0}
                >
                  할인 적용
                </button>
                <button
                  className="w-full py-3 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300"
                  onClick={() => setShowDiscountModal(false)}
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== 지출 모달 ===== */}
      {showExpenseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md mx-4">
            <div className="p-6">
              <h2 className="text-xl font-bold text-center mb-4">기타 지출을 입력해 주세요</h2>
              <div className="mb-4">
                <input
                  type="text"
                  className="w-full p-3 border rounded-md"
                  value={expenseDescription}
                  onChange={e => setExpenseDescription(e.target.value)}
                  placeholder="(필수) 지출 내용을 입력해 주세요"
                />
              </div>
              <div className="mb-4">
                <input
                  type="text"
                  className="w-full p-3 border rounded-md text-right"
                  value={
                    expenseAmount
                      ? `${parseInt(expenseAmount || '0').toLocaleString()} 원`
                      : '0 원'
                  }
                  readOnly
                />
              </div>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(num => (
                  <button
                    key={num}
                    className="p-3 text-lg font-medium rounded-md bg-gray-100 text-gray-800"
                    onClick={() => setExpenseAmount(prev => prev + num.toString())}
                  >
                    {num}
                  </button>
                ))}
                <button
                  className="p-3 text-lg font-medium rounded-md bg-gray-200 text-gray-800"
                  onClick={() =>
                    setExpenseAmount(prev => prev.slice(0, -1))
                  }
                >
                  ←
                </button>
              </div>
              <div className="grid grid-cols-1 gap-3">
                <button
                  className={`w-full py-3 rounded-lg font-medium ${
                    expenseAmount &&
                    parseInt(expenseAmount) > 0 &&
                    expenseDescription.trim() !== ''
                      ? 'bg-blue-500 text-white hover:bg-blue-600'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                  onClick={() => {
                    if (expenseAmount && expenseDescription.trim()) {
                      setExpenses(prev => [
                        ...prev,
                        {
                          id: Date.now(),
                          description: expenseDescription,
                          amount: parseInt(expenseAmount)
                        }
                      ]);
                      setShowExpenseModal(false);
                      setExpenseAmount('');
                      setExpenseDescription('');
                      showToastMessage("지출이 추가되었습니다");
                    }
                  }}
                  disabled={
                    !expenseAmount ||
                    parseInt(expenseAmount) <= 0 ||
                    expenseDescription.trim() === ''
                  }
                >
                  지출 등록
                </button>
                <button
                  className="w-full py-3 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300"
                  onClick={() => setShowExpenseModal(false)}
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== 삭제 확인 모달 ===== */}
      {showDeleteConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md mx-4">
            <div className="p-6">
              <h2 className="text-xl font-bold text-center mb-4">
                {itemToDelete !== null
                  ? "해당 상품을 삭제할까요?"
                  : "해당 지출 항목을 삭제할까요?"}
              </h2>
              <div className="grid grid-cols-1 gap-3">
                <button
                  className="w-full py-3 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600"
                  onClick={() => {
                    if (itemToDelete !== null) {
                      removeOrderItem(itemToDelete);
                    } else if (expenseToDelete !== null) {
                      setExpenses(prev =>
                        prev.filter(exp => exp.id !== expenseToDelete)
                      );
                      showToastMessage("지출 항목이 삭제되었습니다");
                    }
                    setShowDeleteConfirmation(false);
                    setItemToDelete(null);
                    setExpenseToDelete(null);
                  }}
                >
                  {itemToDelete !== null ? "상품 삭제" : "지출 항목 삭제"}
                </button>
                <button
                  className="w-full py-3 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300"
                  onClick={() => {
                    setShowDeleteConfirmation(false);
                    setItemToDelete(null);
                    setExpenseToDelete(null);
                  }}
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

  
      {/* ===== 시간대별 매출 그래프 툴팁 ===== */}
      {tooltip.visible && (
        <div
          style={{ left: tooltip.x, top: tooltip.y, zIndex: 1000 }}
          className="fixed bg-black text-white text-xs p-1 rounded cursor-pointer"
          onClick={() => setTooltip(prev => ({ ...prev, visible: false }))}
        >
          {tooltip.amount.toLocaleString()}원
        </div>
      )}



      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg w-[500px]">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-lg font-medium">카테고리 관리</h2>
              <button onClick={() => setIsModalOpen(false)}>
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-4">
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="(필수) 카테고리 이름을 입력해 주세요"
                  className="w-full p-2 border rounded"
                  value={newCategoryName}
                  onChange={e => setNewCategoryName(e.target.value)}
                />
              </div>
              <button
                onClick={handleAddCategory}
                disabled={!newCategoryName.trim()}
                className={`w-full py-2 rounded mb-4 ${
                  newCategoryName.trim()
                    ? 'bg-blue-500 text-white hover:bg-blue-600'
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                }`}
              >
                저장
              </button>

              <div className="border-t pt-4">
                {productCategories.map(category => (
                  <div
                    key={category.id}
                    className="flex justify-between items-center py-2 border-b"
                  >
                    {editingCategory?.id === category.id ? (
                      <div className="flex-1 flex items-center space-x-2">
                        <input
                          type="text"
                          value={editingText}
                          onChange={e => setEditingText(e.target.value)}
                          className="flex-1 p-1 border rounded"
                          autoFocus
                        />
                        <button
                          onClick={() => handleEditSave(category)}
                          disabled={!editingText.trim()}
                          className={`px-3 py-1 text-sm rounded ${
                            editingText.trim()
                              ? 'bg-blue-500 text-white hover:bg-blue-600'
                              : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                          }`}
                        >
                          저장
                        </button>
                        <button
                          onClick={handleEditCancel}
                          className="px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200"
                        >
                          취소
                        </button>
                      </div>
                    ) : (
                      <>
                        <span>{category.name}</span>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEditClick(category)}
                            className="px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200"
                          >
                            수정
                          </button>
                          <button
                            onClick={() => handleDeleteClick(category)}
                            className="px-3 py-1 text-sm text-red-500 bg-red-50 rounded hover:bg-red-100"
                          >
                            삭제
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg w-[400px] p-6">
            <h3 className="text-lg text-center mb-6">
              해당 카테고리를 삭제할까요?
            </h3>
            <div className="flex flex-col space-y-2">
              <button
                onClick={handleDeleteConfirm}
                className="w-full bg-red-500 text-white py-2 rounded hover:bg-red-600"
              >
                카테고리 삭제
              </button>
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="w-full text-gray-600 py-2 rounded hover:bg-gray-100"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {isProductAddModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg w-[500px] overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-xl font-semibold">새 상품 등록</h3>
              <button onClick={() => setIsProductAddModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <input
                  type="text"
                  placeholder="(필수) 상품 이름을 입력해 주세요"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="relative">
                <select
                  value={newProduct.category}
                  onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">카테고리 선택</option>
                  {productCategories.map(cat => (
                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div className="relative">
                <input
                  type="number"
                  placeholder="(필수) 사입 금액을 입력해 주세요"
                  value={newProduct.price}
                  onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-8"
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">원</span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  placeholder="(필수) 판매 가격을 입력해 주세요"
                  value={newProduct.salesPrice}
                  onChange={(e) => setNewProduct({ ...newProduct, salesPrice: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-8"
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">원</span>
              </div>

              <div className="relative">
                <input
                  type="number"
                  placeholder="(필수) 판매 재고 수량을 입력해 주세요"
                  value={newProduct.salesStock}
                  onChange={(e) => setNewProduct({ ...newProduct, salesStock: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-8"
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">개</span>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-6 border-t bg-gray-50">
              <button
                onClick={() => setIsProductAddModalOpen(false)}
                className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                취소
              </button>
              <button
                onClick={handleAddProduct}
                className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}

      {isProductEditModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg w-[500px] overflow-hidden">
            {/* 헤더 */}
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-xl font-semibold">상품 수정</h3>
              <button onClick={() => setIsProductEditModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>
            {/* 본문: 입력 폼 */}
            <div className="p-6 space-y-4">
              {/* 상품명 */}
              <div>
                <input 
                  type="text" 
                  placeholder="(필수) 상품 이름을 입력해 주세요"
                  value={editProduct.name}
                  onChange={(e) => setEditProduct({ ...editProduct, name: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg 
                             focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              {/* 카테고리 */}
              <div>
                <select 
                  value={editProduct.category}
                  onChange={(e) => setEditProduct({ ...editProduct, category: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg 
                             focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">카테고리 선택</option>
                  {productCategories.map(cat => (
                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                  ))}
                </select>
              </div>
              {/* 사입 금액 */}
              <div className="relative">
                <input 
                  type="number" 
                  placeholder="(필수) 사입 금액을 입력해 주세요"
                  value={editProduct.purchasePrice}
                  onChange={(e) => setEditProduct({ ...editProduct, purchasePrice: e.target.value })}
                  className="w-full p-3 pr-8 border border-gray-300 rounded-lg 
                             focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">원</span>
              </div>
              {/* 판매 가격 */}
              <div className="relative">
                <input 
                  type="number" 
                  placeholder="(필수) 판매 가격을 입력해 주세요"
                  value={editProduct.salesPrice}
                  onChange={(e) => setEditProduct({ ...editProduct, salesPrice: e.target.value })}
                  className="w-full p-3 pr-8 border border-gray-300 rounded-lg 
                             focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">원</span>
              </div>
              {/* 판매 재고 수량 */}
              <div className="relative">
                <input 
                  type="number" 
                  placeholder="(필수) 판매 재고 수량을 입력해 주세요"
                  value={editProduct.quantity}
                  onChange={(e) => setEditProduct({ ...editProduct, quantity: e.target.value })}
                  className="w-full p-3 pr-8 border border-gray-300 rounded-lg 
                             focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">개</span>
              </div>
            </div>
            {/* 푸터: 버튼 */}
            <div className="flex justify-end gap-2 p-6 border-t bg-gray-50">
              <button 
                onClick={() => setIsProductEditModalOpen(false)}
                className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                취소
              </button>
              <button 
                onClick={handleEditProduct}
                className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}

      {isProductDeleteModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-[400px]">
            <h3 className="text-center text-lg mb-6">해당 상품을 삭제할까요?</h3>
            <div className="flex flex-col gap-2">
              <button
                onClick={handleDeleteProduct}
                className="w-full py-2 text-white bg-red-500 rounded"
              >
                상품 삭제
              </button>
              <button
                onClick={() => setIsProductDeleteModalOpen(false)}
                className="w-full py-2 text-gray-600 bg-gray-100 rounded"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {showToast && (
        <div className="fixed bottom-10 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-6 py-3 rounded-lg shadow-lg z-50">
          {toastMessage}
        </div>
      )}
    </div>
  );
}

export default App;
