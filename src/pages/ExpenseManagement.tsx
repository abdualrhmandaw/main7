import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/sonner';
import { 
  TrendingDown, 
  Users, 
  Calendar,
  Plus,
  Edit,
  Trash2,
  DollarSign,
  Building,
  RefreshCw,
  Download
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface ExpenseStats {
  totalExpenses: number;
  monthlyExpenses: number;
  totalSalaries: number;
  activeEmployees: number;
}

interface Employee {
  id?: string;
  name: string;
  position: string;
  salary: number;
  hire_date: string;
  status: 'active' | 'inactive';
  phone?: string;
  notes?: string;
}

interface Expense {
  id?: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  payment_method: string;
  notes?: string;
  created_at?: string;
}

const expenseCategories = [
  'مرتبات',
  'إيجارات',
  'كهرباء وماء',
  'صيانة',
  'وقود ومواصلات',
  'مواد خام',
  'تسويق وإعلان',
  'مصاريف إدارية',
  'أخرى'
];

const paymentMethods = [
  'نقدي',
  'تحويل بنكي',
  'شيك',
  'بطاقة ائتمان'
];

export default function ExpenseManagement() {
  const [stats, setStats] = useState<ExpenseStats>({
    totalExpenses: 0,
    monthlyExpenses: 0,
    totalSalaries: 0,
    activeEmployees: 0
  });

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(false);
  const [showEmployeeDialog, setShowEmployeeDialog] = useState(false);
  const [showExpenseDialog, setShowExpenseDialog] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const [newEmployee, setNewEmployee] = useState<Employee>({
    name: '',
    position: '',
    salary: 0,
    hire_date: new Date().toISOString().split('T')[0],
    status: 'active',
    phone: '',
    notes: ''
  });

  const [newExpense, setNewExpense] = useState<Expense>({
    description: '',
    amount: 0,
    category: '',
    date: new Date().toISOString().split('T')[0],
    payment_method: '',
    notes: ''
  });

  const loadData = async () => {
    try {
      setLoading(true);

      // Create tables if they don't exist
      await supabase.rpc('create_employees_table');
      await supabase.rpc('create_expenses_table');

      // Load employees
      const { data: employeesData } = await supabase
        .from('employees')
        .select('*')
        .order('created_at', { ascending: false });

      // Load expenses
      const { data: expensesData } = await supabase
        .from('expenses')
        .select('*')
        .order('created_at', { ascending: false });

      if (employeesData) {
        setEmployees(employeesData);
      }

      if (expensesData) {
        setExpenses(expensesData);
      }

      // Calculate stats
      const totalExpenses = (expensesData || [])
        .reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0);

      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const monthlyExpenses = (expensesData || [])
        .filter(expense => {
          const expenseDate = new Date(expense.date);
          return expenseDate.getMonth() === currentMonth && 
                 expenseDate.getFullYear() === currentYear;
        })
        .reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0);

      const totalSalaries = (employeesData || [])
        .filter(emp => emp.status === 'active')
        .reduce((sum, emp) => sum + (Number(emp.salary) || 0), 0);

      const activeEmployees = (employeesData || [])
        .filter(emp => emp.status === 'active').length;

      setStats({
        totalExpenses,
        monthlyExpenses,
        totalSalaries,
        activeEmployees
      });

    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('فشل في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const saveEmployee = async () => {
    try {
      const employeeData = editingEmployee ? { ...editingEmployee } : { ...newEmployee };
      
      if (!employeeData.name || !employeeData.position || !employeeData.salary) {
        toast.error('يرجى ملء جميع الحقول المطلوبة');
        return;
      }

      if (editingEmployee) {
        const { error } = await supabase
          .from('employees')
          .update(employeeData)
          .eq('id', editingEmployee.id);
        
        if (error) throw error;
        toast.success('تم تحديث بيانات الموظف');
      } else {
        const { error } = await supabase
          .from('employees')
          .insert([employeeData]);
        
        if (error) throw error;
        toast.success('تم إضافة الموظف بنجاح');
      }

      setShowEmployeeDialog(false);
      setEditingEmployee(null);
      setNewEmployee({
        name: '',
        position: '',
        salary: 0,
        hire_date: new Date().toISOString().split('T')[0],
        status: 'active',
        phone: '',
        notes: ''
      });
      
      loadData();
    } catch (error) {
      console.error('Error saving employee:', error);
      toast.error('فشل في حفظ بيانات الموظف');
    }
  };

  const saveExpense = async () => {
    try {
      const expenseData = editingExpense ? { ...editingExpense } : { ...newExpense };
      
      if (!expenseData.description || !expenseData.amount || !expenseData.category) {
        toast.error('يرجى ملء جميع الحقول المطلوبة');
        return;
      }

      if (editingExpense) {
        const { error } = await supabase
          .from('expenses')
          .update(expenseData)
          .eq('id', editingExpense.id);
        
        if (error) throw error;
        toast.success('تم تحديث المصروف');
      } else {
        const { error } = await supabase
          .from('expenses')
          .insert([expenseData]);
        
        if (error) throw error;
        toast.success('تم إضافة المصروف بنجاح');
      }

      setShowExpenseDialog(false);
      setEditingExpense(null);
      setNewExpense({
        description: '',
        amount: 0,
        category: '',
        date: new Date().toISOString().split('T')[0],
        payment_method: '',
        notes: ''
      });
      
      loadData();
    } catch (error) {
      console.error('Error saving expense:', error);
      toast.error('فشل في حفظ المصروف');
    }
  };

  const deleteEmployee = async (id: string) => {
    try {
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      toast.success('تم حذف الموظف');
      loadData();
    } catch (error) {
      console.error('Error deleting employee:', error);
      toast.error('فشل في حذف الموظف');
    }
  };

  const deleteExpense = async (id: string) => {
    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      toast.success('تم حذف المصروف');
      loadData();
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast.error('فشل في حذف المصروف');
    }
  };

  const exportData = () => {
    const csvData = expenses.map(expense => ({
      'التاريخ': format(new Date(expense.date), 'dd/MM/yyyy', { locale: ar }),
      'الوصف': expense.description,
      'المبلغ': expense.amount,
      'الفئة': expense.category,
      'طريقة الدفع': expense.payment_method,
      'ملاحظات': expense.notes || ''
    }));
    
    const csv = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenses-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary">إدارة المصروفات والمرتبات</h1>
            <p className="text-muted-foreground mt-1">تتبع المصروفات والموظفين والمرتبات</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportData}>
              <Download className="h-4 w-4 ml-2" />
              تصدير التقرير
            </Button>
            <Button variant="outline" onClick={loadData} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ml-2 ${loading ? 'animate-spin' : ''}`} />
              تحديث
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">إجمالي المصروفات</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {stats.totalExpenses.toLocaleString('ar-LY')} د.ل
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">مصروفات الشهر</CardTitle>
              <Calendar className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {stats.monthlyExpenses.toLocaleString('ar-LY')} د.ل
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">إجمالي المرتبات</CardTitle>
              <DollarSign className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {stats.totalSalaries.toLocaleString('ar-LY')} د.ل
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">الموظفين النشطين</CardTitle>
              <Users className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats.activeEmployees}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="expenses" className="space-y-4">
          <TabsList>
            <TabsTrigger value="expenses">المصروفات</TabsTrigger>
            <TabsTrigger value="employees">الموظفين والمرتبات</TabsTrigger>
          </TabsList>

          <TabsContent value="expenses">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>المصروفات والنفقات</CardTitle>
                <Dialog open={showExpenseDialog} onOpenChange={setShowExpenseDialog}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 ml-2" />
                      إضافة مصروف
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>
                        {editingExpense ? 'تعديل المصروف' : 'إضافة مصروف جديد'}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>الوصف</Label>
                        <Input
                          value={editingExpense ? editingExpense.description : newExpense.description}
                          onChange={(e) => {
                            if (editingExpense) {
                              setEditingExpense({ ...editingExpense, description: e.target.value });
                            } else {
                              setNewExpense({ ...newExpense, description: e.target.value });
                            }
                          }}
                          placeholder="وصف المصروف"
                        />
                      </div>
                      <div>
                        <Label>المبلغ</Label>
                        <Input
                          type="number"
                          value={editingExpense ? editingExpense.amount : newExpense.amount}
                          onChange={(e) => {
                            if (editingExpense) {
                              setEditingExpense({ ...editingExpense, amount: Number(e.target.value) });
                            } else {
                              setNewExpense({ ...newExpense, amount: Number(e.target.value) });
                            }
                          }}
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <Label>الفئة</Label>
                        <Select
                          value={editingExpense ? editingExpense.category : newExpense.category}
                          onValueChange={(value) => {
                            if (editingExpense) {
                              setEditingExpense({ ...editingExpense, category: value });
                            } else {
                              setNewExpense({ ...newExpense, category: value });
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="اختر الفئة" />
                          </SelectTrigger>
                          <SelectContent>
                            {expenseCategories.map((category) => (
                              <SelectItem key={category} value={category}>
                                {category}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>التاريخ</Label>
                        <Input
                          type="date"
                          value={editingExpense ? editingExpense.date : newExpense.date}
                          onChange={(e) => {
                            if (editingExpense) {
                              setEditingExpense({ ...editingExpense, date: e.target.value });
                            } else {
                              setNewExpense({ ...newExpense, date: e.target.value });
                            }
                          }}
                        />
                      </div>
                      <div>
                        <Label>طريقة الدفع</Label>
                        <Select
                          value={editingExpense ? editingExpense.payment_method : newExpense.payment_method}
                          onValueChange={(value) => {
                            if (editingExpense) {
                              setEditingExpense({ ...editingExpense, payment_method: value });
                            } else {
                              setNewExpense({ ...newExpense, payment_method: value });
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="اختر طريقة الدفع" />
                          </SelectTrigger>
                          <SelectContent>
                            {paymentMethods.map((method) => (
                              <SelectItem key={method} value={method}>
                                {method}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>ملاحظات</Label>
                        <Textarea
                          value={editingExpense ? editingExpense.notes : newExpense.notes}
                          onChange={(e) => {
                            if (editingExpense) {
                              setEditingExpense({ ...editingExpense, notes: e.target.value });
                            } else {
                              setNewExpense({ ...newExpense, notes: e.target.value });
                            }
                          }}
                          placeholder="ملاحظات إضافية"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={saveExpense} className="flex-1">
                          {editingExpense ? 'تحديث' : 'إضافة'}
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => {
                            setShowExpenseDialog(false);
                            setEditingExpense(null);
                          }}
                          className="flex-1"
                        >
                          إلغاء
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>التاريخ</TableHead>
                        <TableHead>الوصف</TableHead>
                        <TableHead>المبلغ</TableHead>
                        <TableHead>الفئة</TableHead>
                        <TableHead>طريقة الدفع</TableHead>
                        <TableHead>الإجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {expenses.map((expense) => (
                        <TableRow key={expense.id}>
                          <TableCell>
                            {format(new Date(expense.date), 'dd/MM/yyyy', { locale: ar })}
                          </TableCell>
                          <TableCell className="font-medium">
                            {expense.description}
                          </TableCell>
                          <TableCell className="text-red-600">
                            {Number(expense.amount).toLocaleString('ar-LY')} د.ل
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {expense.category}
                            </Badge>
                          </TableCell>
                          <TableCell>{expense.payment_method}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setEditingExpense(expense);
                                  setShowExpenseDialog(true);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => deleteExpense(expense.id!)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="employees">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>الموظفين والمرتبات</CardTitle>
                <Dialog open={showEmployeeDialog} onOpenChange={setShowEmployeeDialog}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 ml-2" />
                      إضافة موظف
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>
                        {editingEmployee ? 'تعديل الموظف' : 'إضافة موظف جديد'}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>الاسم</Label>
                        <Input
                          value={editingEmployee ? editingEmployee.name : newEmployee.name}
                          onChange={(e) => {
                            if (editingEmployee) {
                              setEditingEmployee({ ...editingEmployee, name: e.target.value });
                            } else {
                              setNewEmployee({ ...newEmployee, name: e.target.value });
                            }
                          }}
                          placeholder="اسم الموظف"
                        />
                      </div>
                      <div>
                        <Label>المنصب</Label>
                        <Input
                          value={editingEmployee ? editingEmployee.position : newEmployee.position}
                          onChange={(e) => {
                            if (editingEmployee) {
                              setEditingEmployee({ ...editingEmployee, position: e.target.value });
                            } else {
                              setNewEmployee({ ...newEmployee, position: e.target.value });
                            }
                          }}
                          placeholder="منصب الموظف"
                        />
                      </div>
                      <div>
                        <Label>الراتب</Label>
                        <Input
                          type="number"
                          value={editingEmployee ? editingEmployee.salary : newEmployee.salary}
                          onChange={(e) => {
                            if (editingEmployee) {
                              setEditingEmployee({ ...editingEmployee, salary: Number(e.target.value) });
                            } else {
                              setNewEmployee({ ...newEmployee, salary: Number(e.target.value) });
                            }
                          }}
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <Label>تاريخ التوظيف</Label>
                        <Input
                          type="date"
                          value={editingEmployee ? editingEmployee.hire_date : newEmployee.hire_date}
                          onChange={(e) => {
                            if (editingEmployee) {
                              setEditingEmployee({ ...editingEmployee, hire_date: e.target.value });
                            } else {
                              setNewEmployee({ ...newEmployee, hire_date: e.target.value });
                            }
                          }}
                        />
                      </div>
                      <div>
                        <Label>رقم الهاتف</Label>
                        <Input
                          value={editingEmployee ? editingEmployee.phone : newEmployee.phone}
                          onChange={(e) => {
                            if (editingEmployee) {
                              setEditingEmployee({ ...editingEmployee, phone: e.target.value });
                            } else {
                              setNewEmployee({ ...newEmployee, phone: e.target.value });
                            }
                          }}
                          placeholder="رقم الهاتف"
                        />
                      </div>
                      <div>
                        <Label>الحالة</Label>
                        <Select
                          value={editingEmployee ? editingEmployee.status : newEmployee.status}
                          onValueChange={(value: 'active' | 'inactive') => {
                            if (editingEmployee) {
                              setEditingEmployee({ ...editingEmployee, status: value });
                            } else {
                              setNewEmployee({ ...newEmployee, status: value });
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">نشط</SelectItem>
                            <SelectItem value="inactive">غير نشط</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>ملاحظات</Label>
                        <Textarea
                          value={editingEmployee ? editingEmployee.notes : newEmployee.notes}
                          onChange={(e) => {
                            if (editingEmployee) {
                              setEditingEmployee({ ...editingEmployee, notes: e.target.value });
                            } else {
                              setNewEmployee({ ...newEmployee, notes: e.target.value });
                            }
                          }}
                          placeholder="ملاحظات إضافية"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={saveEmployee} className="flex-1">
                          {editingEmployee ? 'تحديث' : 'إضافة'}
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => {
                            setShowEmployeeDialog(false);
                            setEditingEmployee(null);
                          }}
                          className="flex-1"
                        >
                          إلغاء
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>الاسم</TableHead>
                        <TableHead>المنصب</TableHead>
                        <TableHead>الراتب</TableHead>
                        <TableHead>تاريخ التوظيف</TableHead>
                        <TableHead>الهاتف</TableHead>
                        <TableHead>الحالة</TableHead>
                        <TableHead>الإجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {employees.map((employee) => (
                        <TableRow key={employee.id}>
                          <TableCell className="font-medium">
                            {employee.name}
                          </TableCell>
                          <TableCell>{employee.position}</TableCell>
                          <TableCell className="text-blue-600">
                            {Number(employee.salary).toLocaleString('ar-LY')} د.ل
                          </TableCell>
                          <TableCell>
                            {format(new Date(employee.hire_date), 'dd/MM/yyyy', { locale: ar })}
                          </TableCell>
                          <TableCell>{employee.phone || '—'}</TableCell>
                          <TableCell>
                            <Badge variant={employee.status === 'active' ? 'default' : 'secondary'}>
                              {employee.status === 'active' ? 'نشط' : 'غير نشط'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setEditingEmployee(employee);
                                  setShowEmployeeDialog(true);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => deleteEmployee(employee.id!)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}