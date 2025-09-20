import { supabase } from '@/integrations/supabase/client';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  phone?: string;
  company?: string;
  pricingCategory?: string | null;
  allowedCustomers?: string[] | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  phone?: string;
  company?: string;
}

// تسجيل الدخول البسيط
export const loginUser = async (credentials: LoginCredentials): Promise<{ user: User | null; error: string | null }> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', credentials.email)
      .eq('password', credentials.password)
      .single();

    if (error || !data) {
      return { user: null, error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' };
    }

    const user: User = {
      id: data.id,
      email: data.email,
      name: data.name || '',
      role: data.role as 'admin' | 'user',
      phone: data.phone,
      company: data.company,
      pricingCategory: (data as any).pricing_category ?? null,
      allowedCustomers: (data as any).allowed_customers ?? null,
    };

    // حفظ بيانات المستخدم في localStorage
    localStorage.setItem('currentUser', JSON.stringify(user));

    return { user, error: null };
  } catch (error) {
    console.error('Login error:', error);
    return { user: null, error: 'حدث خطأ أثناء تسجيل الدخول' };
  }
};

// تسجيل مستخدم جديد
export const registerUser = async (userData: RegisterData): Promise<{ user: User | null; error: string | null }> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .insert([{
        email: userData.email,
        password: userData.password,
        name: userData.name,
        phone: userData.phone,
        company: userData.company,
        role: 'user'
      }])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return { user: null, error: 'البريد الإلكتروني مستخدم بالفعل' };
      }
      return { user: null, error: 'حدث خطأ أثناء التسجيل' };
    }

    const user: User = {
      id: data.id,
      email: data.email,
      name: data.name || '',
      role: data.role as 'admin' | 'user',
      phone: data.phone,
      company: data.company,
      pricingCategory: (data as any).pricing_category ?? null,
      allowedCustomers: (data as any).allowed_customers ?? null,
    };

    // حفظ بيانات المستخدم في localStorage
    localStorage.setItem('currentUser', JSON.stringify(user));

    return { user, error: null };
  } catch (error) {
    console.error('Registration error:', error);
    return { user: null, error: 'حدث خطأ أثناء التسجيل' };
  }
};

// تسجيل الخروج
export const logoutUser = (): void => {
  localStorage.removeItem('currentUser');
};

// الحصول على المستخدم الحالي
export const getCurrentUser = (): User | null => {
  try {
    const userStr = localStorage.getItem('currentUser');
    return userStr ? JSON.parse(userStr) : null;
  } catch {
    return null;
  }
};

// التحقق من صلاحية المدير
export const isAdmin = (user: User | null): boolean => {
  return user?.role === 'admin';
};
