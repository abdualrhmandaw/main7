import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import MultiSelect from '@/components/ui/multi-select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { MapPin, Filter, Plus, Search, Edit, Download, Printer } from 'lucide-react';
import { BillboardGridCard } from '@/components/BillboardGridCard';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandGroup, CommandInput, CommandItem, CommandList, CommandEmpty } from '@/components/ui/command';
import { Billboard } from '@/types';
import { searchBillboards } from '@/services/billboardService';
import { fetchAllBillboards } from '@/services/supabaseService';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import * as XLSX from 'xlsx';

export default function Billboards() {
  const navigate = useNavigate();
  const [billboards, setBillboards] = useState<Billboard[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [sizeFilter, setSizeFilter] = useState<string>('all');
  const [municipalityFilter, setMunicipalityFilter] = useState<string>('all');
  const [adTypeFilter, setAdTypeFilter] = useState<string>('all');
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [selectedContractNumbers, setSelectedContractNumbers] = useState<string[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Billboard | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [saving, setSaving] = useState(false);

  // Add billboard dialog
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState<any>({});
  const [adding, setAdding] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  // Image upload states
  const [imagePreview, setImagePreview] = useState<string>('');

  // Data for dropdowns
  const [municipalities, setMunicipalities] = useState<any[]>([]);
  const [sizes, setSizes] = useState<any[]>([]);
  const [levels, setLevels] = useState<string[]>([]);
  const [citiesList, setCitiesList] = useState<string[]>([]);

  // Export to Excel function
  const exportToExcel = async () => {
    try {
      toast.info('جاري تحضير ملف Excel...');
      
      // Prepare data for export
      const exportData = billboards.map((billboard: any) => ({
        'رقم اللوحة': billboard.ID || billboard.id || '',
        'اسم اللوحة': billboard.Billboard_Name || billboard.name || '',
        'المدينة': billboard.City || billboard.city || '',
        'البلدية': billboard.Municipality || billboard.municipality || '',
        'المنطقة': billboard.District || billboard.district || '',
        'أقرب معلم': billboard.Nearest_Landmark || billboard.location || '',
        'المقاس': billboard.Size || billboard.size || '',
        'المستوى': billboard.Level || billboard.level || '',
        'الحالة': billboard.Status || billboard.status || '',
        'رقم العقد': billboard.Contract_Number || billboard.contractNumber || '',
        'اسم العميل': billboard.Customer_Name || billboard.clientName || '',
        'نوع الإعلان': billboard.Ad_Type || billboard.adType || '',
        'تاريخ بداية الإيجار': billboard.Rent_Start_Date || billboard.rent_start_date || '',
        'تاريخ نهاية الإيجار': billboard.Rent_End_Date || billboard.rent_end_date || '',
        'لوحة شراكة': billboard.is_partnership ? 'نعم' : 'لا',
        'الشركات المشاركة': Array.isArray(billboard.partner_companies) 
          ? billboard.partner_companies.join(', ') 
          : billboard.partner_companies || '',
        'رأس المال': billboard.capital || 0,
        'المتبقي من رأس المال': billboard.capital_remaining || 0,
        'إحداثيات GPS': billboard.GPS_Coordinates || '',
        'رابط الصورة': billboard.Image_URL || billboard.image || ''
      }));

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);

      // Set column widths
      const colWidths = [
        { wch: 12 }, // رقم اللوحة
        { wch: 15 }, // اسم اللوحة
        { wch: 12 }, // المدينة
        { wch: 15 }, // البلدية
        { wch: 12 }, // المنطقة
        { wch: 20 }, // أقرب معلم
        { wch: 10 }, // المقاس
        { wch: 8 },  // المستوى
        { wch: 10 }, // الحالة
        { wch: 12 }, // رقم العقد
        { wch: 15 }, // اسم العميل
        { wch: 12 }, // نوع الإعلان
        { wch: 15 }, // تاريخ بداية الإيجار
        { wch: 15 }, // تاريخ نهاية الإيجار
        { wch: 12 }, // لوحة شراكة
        { wch: 20 }, // الشركات المشاركة
        { wch: 12 }, // رأس المال
        { wch: 15 }, // المتبقي من رأس المال
        { wch: 20 }, // إحداثيات GPS
        { wch: 25 }  // رابط الصورة
      ];
      ws['!cols'] = colWidths;

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'اللوحات الإعلانية');

      // Generate filename with current date
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const filename = `اللوحات_الإعلانية_${dateStr}.xlsx`;

      // Save file
      XLSX.writeFile(wb, filename);
      
      toast.success(`تم تنزيل ملف Excel: ${filename}`);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast.error('فشل في تصدير ملف Excel');
    }
  };

  // Print available billboards function
  const printAvailableBillboards = () => {
    try {
      // Filter available billboards
      const availableBillboards = billboards.filter((billboard: any) => {
        const statusValue = String(billboard.Status ?? billboard.status ?? '').trim();
        const statusLower = statusValue.toLowerCase();
        const hasContract = !!(billboard.Contract_Number ?? billboard.contractNumber);
        return (statusLower === 'available' || statusValue === 'متاح') && !hasContract;
      });

      if (availableBillboards.length === 0) {
        toast.warning('لا توجد لوحات متاحة للطباعة');
        return;
      }

      // Create print content
      const printContent = `
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
          <meta charset="UTF-8">
          <title>اللوحات الإعلانية المتاحة</title>
          <style>
            body {
              font-family: 'Arial', sans-serif;
              margin: 20px;
              direction: rtl;
              text-align: right;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 2px solid #333;
              padding-bottom: 20px;
            }
            .header h1 {
              color: #333;
              margin-bottom: 10px;
            }
            .header p {
              color: #666;
              margin: 5px 0;
            }
            .stats {
              background: #f5f5f5;
              padding: 15px;
              border-radius: 8px;
              margin-bottom: 20px;
              text-align: center;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
              font-size: 12px;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 8px;
              text-align: right;
            }
            th {
              background-color: #f2f2f2;
              font-weight: bold;
            }
            tr:nth-child(even) {
              background-color: #f9f9f9;
            }
            .footer {
              margin-top: 30px;
              text-align: center;
              font-size: 10px;
              color: #666;
              border-top: 1px solid #ddd;
              padding-top: 15px;
            }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>اللوحات الإعلانية المتاحة</h1>
            <p>تاريخ الطباعة: ${new Date().toLocaleDateString('ar-SA')}</p>
            <p>الوقت: ${new Date().toLocaleTimeString('ar-SA')}</p>
          </div>
          
          <div class="stats">
            <strong>إجمالي اللوحات المتاحة: ${availableBillboards.length} لوحة</strong>
          </div>

          <table>
            <thead>
              <tr>
                <th>رقم اللوحة</th>
                <th>اسم اللوحة</th>
                <th>المدينة</th>
                <th>البلدية</th>
                <th>المنطقة</th>
                <th>أقرب معلم</th>
                <th>المقاس</th>
                <th>المستوى</th>
                <th>إحداثيات GPS</th>
              </tr>
            </thead>
            <tbody>
              ${availableBillboards.map((billboard: any) => `
                <tr>
                  <td>${billboard.ID || billboard.id || ''}</td>
                  <td>${billboard.Billboard_Name || billboard.name || ''}</td>
                  <td>${billboard.City || billboard.city || ''}</td>
                  <td>${billboard.Municipality || billboard.municipality || ''}</td>
                  <td>${billboard.District || billboard.district || ''}</td>
                  <td>${billboard.Nearest_Landmark || billboard.location || ''}</td>
                  <td>${billboard.Size || billboard.size || ''}</td>
                  <td>${billboard.Level || billboard.level || ''}</td>
                  <td>${billboard.GPS_Coordinates || ''}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="footer">
            <p>تم إنشاء هذا التقرير تلقائياً من نظام إدارة اللوحات الإعلانية</p>
          </div>
        </body>
        </html>
      `;

      // Open print window
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.focus();
        
        // Wait for content to load then print
        setTimeout(() => {
          printWindow.print();
        }, 500);
        
        toast.success(`تم تحضير ${availableBillboards.length} لوحة متاحة للطباعة`);
      } else {
        toast.error('فشل في فتح نافذة الطباعة. يرجى السماح بالنوافذ المنبثقة.');
      }
    } catch (error) {
      console.error('Error printing available billboards:', error);
      toast.error('فشل في طباعة اللوحات المتاحة');
    }
  };

  // Load dropdown data
  const loadDropdownData = async () => {
    try {
      // Load municipalities
      const { data: munData } = await supabase.from('municipalities').select('*');
      setMunicipalities(munData || []);

      // Load sizes from sizes table
      const { data: sizesData } = await supabase
        .from('sizes')
        .select('*')
        .order('name');
      setSizes(sizesData || []);

      // Load unique levels from sizes table
      const uniqueLevels = [...new Set((sizesData || []).map(s => s.level).filter(Boolean))];
      setLevels(uniqueLevels);

      // Load distinct cities from billboards
      const { data: cityRows } = await supabase
        .from('billboards')
        .select('City')
        .not('City', 'is', null);
      const uniqueCities = [...new Set((cityRows || []).map((r: any) => r.City).filter(Boolean))] as string[];
      setCitiesList(uniqueCities);
    } catch (error) {
      console.error('Error loading dropdown data:', error);
    }
  };

  // Generate next billboard ID
  const generateNextBillboardId = async () => {
    try {
      const { data, error } = await supabase
        .from('billboards')
        .select('ID')
        .order('ID', { ascending: false })
        .limit(1);
      
      if (error) throw error;
      
      const lastId = data && data.length > 0 ? data[0].ID : 0;
      return lastId + 1;
    } catch (error) {
      console.error('Error generating billboard ID:', error);
      return 1;
    }
  };

  // Generate billboard name based on municipality code and ID (e.g., SJ0002)
  const generateBillboardName = (municipalityName: string, billboardId: number) => {
    const municipality = municipalities.find(m => m.name === municipalityName);
    const municipalityCode = (municipality?.code || 'UNK').toUpperCase();
    return `${municipalityCode}${String(billboardId).padStart(4, '0')}`;
  };

  // Add new municipality if it doesn't exist
  const addMunicipalityIfNew = async (name: string) => {
    if (!name.trim()) return;
    
    const exists = municipalities.find(m => m.name === name);
    if (!exists) {
      try {
        const newCode = `AUTO-${String(municipalities.length + 1).padStart(3, '0')}`;
        const { data, error } = await supabase
          .from('municipalities')
          .insert({ name: name.trim(), code: newCode })
          .select()
          .single();
        
        if (error) throw error;
        
        setMunicipalities(prev => [...prev, data]);
        toast.success(`تم إضافة بلدية جديدة: ${name}`);
      } catch (error) {
        console.error('Error adding municipality:', error);
      }
    }
  };

  // Add new size if it doesn't exist
  const addSizeIfNew = async (sizeName: string, level: string = 'A') => {
    if (!sizeName.trim()) return;
    
    const exists = sizes.find(s => s.name === sizeName);
    if (!exists) {
      try {
        const { data, error } = await supabase
          .from('sizes')
          .insert({ name: sizeName.trim(), level: level })
          .select()
          .single();
        
        if (error) throw error;
        
        setSizes(prev => [...prev, data]);
        toast.success(`تم إضافة مقاس جديد: ${sizeName}`);
      } catch (error) {
        console.error('Error adding size:', error);
      }
    }
  };

  // Add new level if it doesn't exist
  const addLevelIfNew = async (level: string) => {
    if (!level.trim()) return;
    
    const exists = levels.find(l => l === level);
    if (!exists) {
      setLevels(prev => [...prev, level.trim()]);
      toast.success(`تم إضافة مستوى جديد: ${level}`);
    }
  };

  const openEdit = (bb: Billboard) => {
    setEditing(bb);
    setEditForm({
      Billboard_Name: (bb as any).Billboard_Name || bb.name || '',
      City: (bb as any).City || bb.city || '',
      Municipality: (bb as any).Municipality || (bb as any).municipality || '',
      District: (bb as any).District || (bb as any).district || '',
      Nearest_Landmark: (bb as any).Nearest_Landmark || bb.location || '',
      Size: (bb as any).Size || bb.size || '',
      Status: (bb as any).Status || bb.status || 'available',
      Level: (bb as any).Level || bb.level || 'A',
      Contract_Number: (bb as any).contractNumber || (bb as any).Contract_Number || '',
      Customer_Name: (bb as any).clientName || (bb as any).Customer_Name || '',
      Ad_Type: (bb as any).adType || (bb as any).Ad_Type || '',
      Image_URL: (bb as any).Image_URL || bb.image || '',
      image_name: (bb as any).image_name || '',
      // partnership fields
      is_partnership: !!(bb as any).is_partnership,
      partner_companies: (bb as any).partner_companies || (bb as any).partners || [],
      capital: (bb as any).capital || 0,
      capital_remaining: (bb as any).capital_remaining || (bb as any).capitalRemaining || (bb as any).capital || 0
    });
    setImagePreview((bb as any).Image_URL || (bb as any).image || '');
    setEditOpen(true);
  };

  // Initialize add form with auto-generated ID
  const initializeAddForm = async () => {
    const nextId = await generateNextBillboardId();
    setAddForm({
      ID: nextId,
      Billboard_Name: '',
      City: '',
      Municipality: '',
      District: '',
      Nearest_Landmark: '',
      Size: '',
      Level: '',
      Image_URL: '',
      image_name: '',
      is_partnership: false,
      partner_companies: [],
      capital: 0,
      capital_remaining: 0
    });
  };

  // Update billboard name when municipality, level, or size changes
  useEffect(() => {
    if (addForm.Municipality && addForm.ID) {
      const generatedName = generateBillboardName(addForm.Municipality, addForm.ID);
      setAddForm(prev => ({ ...prev, Billboard_Name: generatedName }));
    }
  }, [addForm.Municipality, addForm.ID, municipalities]);

  // Handle image selection for add/edit forms
  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>, isEdit: boolean = false) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const preview = e.target?.result as string;
        setImagePreview(preview);

        const ext = file.name.includes('.') ? file.name.substring(file.name.lastIndexOf('.') + 1) : 'jpg';
        const safeName = (isEdit ? (editForm.Billboard_Name || '') : (addForm.Billboard_Name || '')) || file.name.replace(/\.[^/.]+$/, '');
        const sanitized = String(safeName).replace(/[^\w\u0600-\u06FF-]+/g, '_');
        const imageName = `${sanitized}.${ext}`;
        if (isEdit) {
          setEditForm((prev: any) => ({ ...prev, image_name: imageName, Image_URL: `/image/${imageName}` }));
        } else {
          setAddForm((prev: any) => ({ ...prev, image_name: imageName, Image_URL: `/image/${imageName}` }));
        }
      };
      reader.readAsDataURL(file);

      toast.success(`تم اختيار الصورة: ${file.name}. سيتم استخدام اسم الملف بناءً على اسم اللوحة.`);
    }
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    const id = (editing as any).ID ?? (editing as any).id;
    const { City, Municipality, District, Nearest_Landmark, Size, Level, Image_URL, image_name, is_partnership, partner_companies, capital, capital_remaining } = editForm as any;
    
    // Add new municipality if it doesn't exist
    await addMunicipalityIfNew(Municipality);
    
    const payload: any = { 
      // Billboard_Name is NOT included - it should not be editable in edit mode
      City, 
      Municipality, 
      District, 
      Nearest_Landmark, 
      Size, 
      Level, 
      Image_URL, 
      image_name,
      is_partnership: !!is_partnership, 
      partner_companies: Array.isArray(partner_companies) ? partner_companies : String(partner_companies).split(',').map(s=>s.trim()).filter(Boolean), 
      capital: Number(capital)||0, 
      capital_remaining: Number(capital_remaining)||Number(capital)||0 
    };

    const { error } = await supabase.from('billboards').update(payload).eq('ID', Number(id));

    if (error) {
      toast.error(`فشل حفظ التعديلات: ${error.message}`);
    } else {
      toast.success('تم حفظ التعديلات');
      try {
        await loadBillboards();
      } catch {}
      setEditOpen(false);
      setEditing(null);
      setImagePreview('');
    }
    setSaving(false);
  };

  // Rename selected image automatically when name changes
  useEffect(() => {
    if (addForm.Billboard_Name && addForm.image_name) {
      const ext = addForm.image_name.includes('.') ? addForm.image_name.substring(addForm.image_name.lastIndexOf('.') + 1) : 'jpg';
      const sanitized = String(addForm.Billboard_Name).replace(/[^\w\u0600-\u06FF-]+/g, '_');
      const imageName = `${sanitized}.${ext}`;
      if (imageName !== addForm.image_name) {
        setAddForm((prev:any) => ({ ...prev, image_name: imageName, Image_URL: `/image/${imageName}` }));
      }
    }
  }, [addForm.Billboard_Name]);

  useEffect(() => {
    if (editForm.Billboard_Name && editForm.image_name) {
      const ext = editForm.image_name.includes('.') ? editForm.image_name.substring(editForm.image_name.lastIndexOf('.') + 1) : 'jpg';
      const sanitized = String(editForm.Billboard_Name).replace(/[^\w\u0600-\u06FF-]+/g, '_');
      const imageName = `${sanitized}.${ext}`;
      if (imageName !== editForm.image_name) {
        setEditForm((prev:any) => ({ ...prev, image_name: imageName, Image_URL: `/image/${imageName}` }));
      }
    }
  }, [editForm.Billboard_Name]);

  const addBillboard = async () => {
    // Validate required fields
    if (!addForm.Municipality || !addForm.Level || !addForm.Size) {
      toast.error('يرجى تحديد البلدية والمستوى والمقاس');
      return;
    }

    setAdding(true);
    const { ID, Billboard_Name, City, Municipality, District, Nearest_Landmark, GPS_Coordinates, Size, Level, Image_URL, image_name, is_partnership, partner_companies, capital, capital_remaining } = addForm as any;
    
    // Add new municipality, size, level if they don't exist
    await addMunicipalityIfNew(Municipality);
    await addSizeIfNew(Size, Level);
    await addLevelIfNew(Level);
    
    const payload: any = {
      ID: Number(ID),
      Billboard_Name,
      City,
      Municipality,
      District,
      Nearest_Landmark,
      GPS_Coordinates: GPS_Coordinates || null,
      Size,
      Level,
      Image_URL,
      image_name,
      Status: 'متاح', // Always available by default, status is managed by contracts
      is_partnership: !!is_partnership,
      partner_companies: Array.isArray(partner_companies) ? partner_companies : String(partner_companies).split(',').map(s=>s.trim()).filter(Boolean),
      capital: Number(capital)||0,
      capital_remaining: Number(capital_remaining)||Number(capital)||0
    };
    try {
      const { error } = await supabase.from('billboards').insert(payload).select().single();
      if (error) throw error;
      toast.success('تم إضافة اللوحة');
      await loadBillboards();
      setAddOpen(false);
      setImagePreview('');
      await initializeAddForm(); // Reset form with new ID
    } catch (e:any) {
      console.error('add billboard error', e);
      toast.error(e?.message || 'فشل الإضافة');
    } finally {
      setAdding(false);
    }
  };

  const loadBillboards = async () => {
    try {
      const data = await fetchAllBillboards();
      setBillboards(data as any);
      console.log('Loaded billboards (with fallbacks):', data.length);
    } catch (error) {
      console.error('خطأ في تحميل اللوحات:', (error as any)?.message || JSON.stringify(error));
      setBillboards([] as any);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      await loadDropdownData();
      await loadBillboards();
      await initializeAddForm();
      setLoading(false);
    };

    fetchData();
  }, []);

  const cities = [...new Set(billboards.map(b => (b as any).City || b.city).filter(Boolean))];
  const billboardSizes = [...new Set(billboards.map(b => (b as any).Size || b.size).filter(Boolean))];
  const billboardMunicipalities = [...new Set(billboards.map(b => (b as any).Municipality || (b as any).municipality).filter(Boolean))];
  const districts = [...new Set(billboards.map(b => (b as any).District || (b as any).district).filter(Boolean))];
  const uniqueAdTypes = [...new Set(billboards.map((b:any) => (b.Ad_Type ?? b['Ad Type'] ?? b.adType ?? '')).filter(Boolean))] as string[];
  const uniqueCustomers = [...new Set(billboards.map((b:any) => (b.Customer_Name ?? b.clientName ?? b.contract?.customer_name ?? '')).filter(Boolean))] as string[];
  const uniqueContractNumbers = [...new Set(billboards.map((b:any) => String(b.Contract_Number ?? b.contractNumber ?? '')).filter((v:string) => v && v !== 'undefined' && v !== 'null'))] as string[];

  // Keep citiesList in sync with loaded billboards as a fallback
  useEffect(() => {
    const uniq = [...new Set(billboards.map((b:any) => (b.City || b.city)).filter(Boolean))];
    if (uniq.length && (!citiesList.length || uniq.length !== citiesList.length)) setCitiesList(uniq as string[]);
  }, [billboards]);

  const searched = searchBillboards(billboards, searchQuery);
  const filteredBillboards = searched.filter((billboard) => {
    const statusValue = String(((billboard as any).Status ?? (billboard as any).status ?? '')).trim();
    const statusLower = statusValue.toLowerCase();
    const hasContract = !!(((billboard as any).Contract_Number ?? (billboard as any).contractNumber));
    const isAvailable = (statusLower === 'available' || statusValue === 'متاح') && !hasContract;
    const isBooked = (statusLower === 'rented' || statusValue === 'مؤجر' || statusValue === 'محجوز') || hasContract;
    let isNearExpiry = false;
    const end = (billboard as any).Rent_End_Date ?? (billboard as any).rent_end_date;
    if (end) {
      try {
        const endDate = new Date(end);
        const diffDays = Math.ceil((endDate.getTime() - Date.now()) / 86400000);
        isNearExpiry = diffDays > 0 && diffDays <= 20;
      } catch {}
    }
    const matchesStatus = selectedStatuses.length === 0 || selectedStatuses.some(s => (
      (s === 'متاحة' && isAvailable) ||
      (s === 'محجوز' && isBooked) ||
      (s === 'قريبة الانتهاء' && isNearExpiry)
    ));
    const matchesCity = selectedCities.length === 0 || selectedCities.includes((billboard as any).City || billboard.city || '');
    const matchesSize = sizeFilter === 'all' || (((billboard as any).Size || billboard.size || '') === sizeFilter);
    const matchesMunicipality = municipalityFilter === 'all' || (((billboard as any).Municipality || (billboard as any).municipality || '') === municipalityFilter);
    const adTypeVal = String((billboard as any).Ad_Type ?? (billboard as any)['Ad Type'] ?? (billboard as any).adType ?? '');
    const matchesAdType = adTypeFilter === 'all' || adTypeVal === adTypeFilter;
    const customerVal = String((billboard as any).Customer_Name ?? (billboard as any).clientName ?? (billboard as any).contract?.customer_name ?? '');
    const matchesCustomer = selectedCustomers.length === 0 || selectedCustomers.includes(customerVal);
    const contractNoVal = String((billboard as any).Contract_Number ?? (billboard as any).contractNumber ?? '');
    const matchesContractNo = selectedContractNumbers.length === 0 || selectedContractNumbers.includes(contractNoVal);
    return matchesStatus && matchesCity && matchesSize && matchesMunicipality && matchesAdType && matchesCustomer && matchesContractNo;
  });

  const totalPages = Math.max(1, Math.ceil(filteredBillboards.length / PAGE_SIZE));
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const pagedBillboards = filteredBillboards.slice(startIndex, startIndex + PAGE_SIZE);

  // Calculate available billboards count
  const availableBillboardsCount = billboards.filter((billboard: any) => {
    const statusValue = String(billboard.Status ?? billboard.status ?? '').trim();
    const statusLower = statusValue.toLowerCase();
    const hasContract = !!(billboard.Contract_Number ?? billboard.contractNumber);
    return (statusLower === 'available' || statusValue === 'متاح') && !hasContract;
  }).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">جاري تحميل اللوحات الإعلانية...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* العنوان والأزرار */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">إدارة اللوحات الإعلانية</h1>
          <p className="text-muted-foreground">عرض وإدارة جميع اللوحات الإعلانية مع معلومات العقود المرتبطة</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={exportToExcel}
            variant="outline"
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            تصدير Excel
          </Button>
          <Button 
            onClick={printAvailableBillboards}
            variant="outline"
            className="gap-2"
          >
            <Printer className="h-4 w-4" />
            طباعة المتاحة ({availableBillboardsCount})
          </Button>
          <Button onClick={() => {
            initializeAddForm();
            setAddOpen(true);
          }} className="bg-gradient-primary text-white shadow-elegant hover:shadow-glow transition-smooth">
            <Plus className="h-4 w-4 ml-2" />
            إضافة لوحة
          </Button>
          <Button variant="outline" onClick={() => navigate('/admin/shared-billboards')}>اللوحات المشتركة</Button>
        </div>
      </div>

      {/* أدوات التصفية والبحث */}
      <Card className="bg-gradient-card border-0 shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="h-5 w-5 text-primary" />
            البحث في اللوحات...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ابحث عن اللوحات..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
              />
            </div>
            
            <MultiSelect
              options={[
                { label: 'متاحة', value: 'متاحة' },
                { label: 'قريبة الانتهاء', value: 'قريبة الانتهاء' },
                { label: 'محجوز', value: 'محجوز' },
              ]}
              value={selectedStatuses}
              onChange={setSelectedStatuses}
              placeholder="الحالة (متعدد)"
            />

            <MultiSelect
              options={cities.map(c => ({ label: c, value: c }))}
              value={selectedCities}
              onChange={setSelectedCities}
              placeholder="جميع المدن"
            />

            <Select value={sizeFilter} onValueChange={setSizeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="حجم اللوحة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الأحجام</SelectItem>
                {billboardSizes.map((s) => (<SelectItem key={String(s)} value={String(s)}>{String(s)}</SelectItem>))}
              </SelectContent>
            </Select>

            <Select value={municipalityFilter} onValueChange={setMunicipalityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="البلدية" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع البلديات</SelectItem>
                {billboardMunicipalities.map((m) => (<SelectItem key={String(m)} value={String(m)}>{String(m)}</SelectItem>))}
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2">
                  {adTypeFilter === 'all' ? 'نوع الإعلان (الكل)' : `نوع الإعلان: ${adTypeFilter}`}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-0" align="start">
                <Command>
                  <CommandInput placeholder="ابحث عن نوع الإعلان..." />
                  <CommandList>
                    <CommandEmpty>لا يوجد نتائج</CommandEmpty>
                    <CommandGroup>
                      <CommandItem onSelect={() => setAdTypeFilter('all')}>الكل</CommandItem>
                      {uniqueAdTypes.map((t) => (
                        <CommandItem key={t} onSelect={() => setAdTypeFilter(t)}>{t}</CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            <MultiSelect
              options={uniqueCustomers.map((c) => ({ label: c, value: c }))}
              value={selectedCustomers}
              onChange={setSelectedCustomers}
              placeholder="أسماء الزبائن (متعدد)"
            />

            <MultiSelect
              options={uniqueContractNumbers.map((n) => ({ label: n, value: n }))}
              value={selectedContractNumbers}
              onChange={setSelectedContractNumbers}
              placeholder="أرقام العقود (متعدد)"
            />
          </div>
        </CardContent>
      </Card>

      {/* عرض اللوحات */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {pagedBillboards.map((billboard, idx) => {
          const keyVal = String((billboard as any).id ?? (billboard as any).ID ?? `${(billboard as any).Billboard_Name ?? 'bb'}-${startIndex + idx}`);
          return (
            <div key={keyVal} className="space-y-2">
              <BillboardGridCard billboard={billboard as any} showBookingActions={false} />
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => openEdit(billboard)}>
                  <Edit className="h-4 w-4 ml-1" />
                  تعديل
                </Button>
                <Button variant="destructive" size="sm" onClick={async () => {
                  try {
                    if (!window.confirm('هل تريد حذف هذه اللوحة؟')) return;
                    const bid = (billboard as any).ID ?? (billboard as any).id;
                    const { error } = await supabase.from('billboards').delete().eq('ID', Number(bid));
                    if (error) throw error;
                    toast.success('تم حذف اللوحة');
                    await loadBillboards();
                  } catch (e:any) {
                    toast.error(e?.message || 'فشل الحذف');
                  }
                }}>
                  حذف
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredBillboards.length > 0 && (
        <div className="mt-6">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
                />
              </PaginationItem>

              {(() => {
                const windowSize = 5;
                let start = Math.max(1, currentPage - Math.floor(windowSize / 2));
                let end = start + windowSize - 1;
                if (end > totalPages) {
                  end = totalPages;
                  start = Math.max(1, end - windowSize + 1);
                }
                return Array.from({ length: end - start + 1 }, (_, idx) => start + idx).map((p) => (
                  <PaginationItem key={p}>
                    <PaginationLink isActive={currentPage === p} onClick={() => setCurrentPage(p)}>
                      {p}
                    </PaginationLink>
                  </PaginationItem>
                ));
              })()}

              <PaginationItem>
                <PaginationNext
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      {filteredBillboards.length === 0 && (
        <Card className="bg-gradient-card border-0 shadow-card">
          <CardContent className="p-12 text-center">
            <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">لا توجد لوحات</h3>
            <p className="text-muted-foreground">لم يتم العثور على لوحات تطابق معايير البحث المحددة</p>
          </CardContent>
        </Card>
      )}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تعديل اللوحة</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>الاسم (غير قابل للتعديل)</Label>
              <Input 
                value={editForm.Billboard_Name || ''} 
                disabled 
                className="bg-muted cursor-not-allowed"
                title="اسم اللوحة غير قابل للتعديل"
              />
            </div>
            <div>
              <Label>المدينة</Label>
              <Select value={editForm.City || ''} onValueChange={(v) => setEditForm((p: any) => ({ ...p, City: v }))}>
                <SelectTrigger><SelectValue placeholder="اختر المدينة" /></SelectTrigger>
                <SelectContent>
                  {citiesList.map((c) => (<SelectItem key={c} value={c as string}>{c}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label>أقرب معلم</Label>
              <Input value={editForm.Nearest_Landmark || ''} onChange={(e) => setEditForm((p: any) => ({ ...p, Nearest_Landmark: e.target.value }))} />
            </div>
            <div>
              <Label>البلدية</Label>
              <Select value={editForm.Municipality || ''} onValueChange={(v) => setEditForm((p: any) => ({ ...p, Municipality: v }))}>
                <SelectTrigger><SelectValue placeholder="اختر البلدية" /></SelectTrigger>
                <SelectContent>
                  {municipalities.map((m) => (<SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>المنطقة</Label>
              <Input list="district-list" value={editForm.District || ''} onChange={(e) => setEditForm((p: any) => ({ ...p, District: e.target.value }))} placeholder="اختر أو اكتب منطقة" />
              <datalist id="district-list">
                {districts.map((d) => (<option key={String(d)} value={String(d)} />))}
              </datalist>
            </div>
            <div>
              <Label>المقاس</Label>
              <Select value={editForm.Size || ''} onValueChange={(v) => setEditForm((p: any) => ({ ...p, Size: v }))}>
                <SelectTrigger><SelectValue placeholder="اختر المقاس" /></SelectTrigger>
                <SelectContent>
                  {sizes.map((s) => (<SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>المستوى</Label>
              <Select value={editForm.Level || ''} onValueChange={(v) => setEditForm((p: any) => ({ ...p, Level: v }))}>
                <SelectTrigger><SelectValue placeholder="اختر المستوى" /></SelectTrigger>
                <SelectContent>
                  {levels.map((lv) => (<SelectItem key={String(lv)} value={String(lv)}>{String(lv)}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Image Upload Section */}
            <div className="sm:col-span-2">
              <Label>صورة اللوحة</Label>
              <div className="space-y-2">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageSelect(e, true)}
                />
                <Input
                  placeholder="أو أدخل رابط الصورة (اختياري)"
                  value={editForm.Image_URL || ''}
                  onChange={(e) => setEditForm((p: any) => ({ ...p, Image_URL: e.target.value }))}
                />
                {imagePreview && (
                  <div className="w-full h-48 bg-muted rounded-lg overflow-hidden">
                    <img
                      src={imagePreview}
                      alt="معاينة الصورة"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                {editForm.image_name && (
                  <div className="text-sm text-muted-foreground">
                    اسم الملف: {editForm.image_name}
                  </div>
                )}
              </div>
            </div>

            <div className="sm:col-span-2">
              <div className="flex items-center gap-3">
                <Label>لوحة شراكة</Label>
                <input type="checkbox" checked={!!editForm.is_partnership} onChange={(e)=> setEditForm((p:any)=>({...p, is_partnership: e.target.checked}))} />
              </div>
            </div>

            {editForm.is_partnership && (
              <>
                <div className="sm:col-span-2">
                  <Label>الشركات المشاركة (فصل بالفواصل)</Label>
                  <Input value={(Array.isArray(editForm.partner_companies)? editForm.partner_companies.join(', ') : editForm.partner_companies || '')} onChange={(e)=> setEditForm((p:any)=>({...p, partner_companies: e.target.value}))} />
                </div>
                <div>
                  <Label>رأس مال اللوحة</Label>
                  <Input type="number" value={editForm.capital || 0} onChange={(e)=> setEditForm((p:any)=>({...p, capital: Number(e.target.value)}))} />
                </div>
                <div>
                  <Label>المتبقي من رأس المال</Label>
                  <Input type="number" value={editForm.capital_remaining || editForm.capital || 0} onChange={(e)=> setEditForm((p:any)=>({...p, capital_remaining: Number(e.target.value)}))} />
                </div>
              </>
            )}

          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => {
              setEditOpen(false);
              setImagePreview('');
            }}>إلغاء</Button>
            <Button onClick={saveEdit} disabled={saving}>{saving ? 'جارٍ الحفظ...' : 'حفظ'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Billboard Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>إضافة لوحة جديدة</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>رقم اللوحة (تلقائي)</Label>
              <Input 
                type="number" 
                value={addForm.ID || ''} 
                disabled 
                className="bg-muted cursor-not-allowed"
                placeholder="يتم إنشاؤه تلقائياً" 
              />
            </div>
            <div>
              <Label>اسم اللوحة (تلقائي)</Label>
              <Input 
                value={addForm.Billboard_Name || ''} 
                disabled 
                className="bg-muted cursor-not-allowed"
                placeholder="يتم إنشاؤه تلقائياً" 
              />
            </div>
            <div>
              <Label>المدينة</Label>
              <Select value={addForm.City || ''} onValueChange={(v) => setAddForm((p: any) => ({ ...p, City: v }))}>
                <SelectTrigger><SelectValue placeholder="اختر المدينة" /></SelectTrigger>
                <SelectContent>
                  {citiesList.map((c) => (<SelectItem key={c} value={c as string}>{c}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>البلدية * (مطلوب)</Label>
              <Select value={addForm.Municipality || ''} onValueChange={(v) => setAddForm((p: any) => ({ ...p, Municipality: v }))}>
                <SelectTrigger><SelectValue placeholder="اختر البلدية" /></SelectTrigger>
                <SelectContent>
                  {municipalities.map((m) => (<SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label>أقرب معلم</Label>
              <Input value={addForm.Nearest_Landmark || ''} onChange={(e) => setAddForm((p: any) => ({ ...p, Nearest_Landmark: e.target.value }))} />
            </div>
            <div>
              <Label>المقاس * (مطلوب)</Label>
              <div className="space-y-2">
                <Select 
                  value={addForm.Size || ''} 
                  onValueChange={(v) => {
                    if (v === '__add_new__') {
                      const newSize = prompt('أدخل المقاس الجديد:');
                      if (newSize && newSize.trim()) {
                        addSizeIfNew(newSize.trim(), addForm.Level || 'A');
                        setAddForm((p: any) => ({ ...p, Size: newSize.trim() }));
                      }
                    } else {
                      setAddForm((p: any) => ({ ...p, Size: v }));
                    }
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="اختر المقاس أو أضف جديد" /></SelectTrigger>
                  <SelectContent>
                    {sizes.map((s) => (<SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>))}
                    <SelectItem value="__add_new__" className="text-blue-600 font-medium">
                      + إضافة مقاس جديد
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>المستوى * (مطلوب)</Label>
              <div className="space-y-2">
                <Select 
                  value={addForm.Level || ''} 
                  onValueChange={(v) => {
                    if (v === '__add_new__') {
                      const newLevel = prompt('أدخل المستوى الجديد:');
                      if (newLevel && newLevel.trim()) {
                        addLevelIfNew(newLevel.trim());
                        setAddForm((p: any) => ({ ...p, Level: newLevel.trim() }));
                      }
                    } else {
                      setAddForm((p: any) => ({ ...p, Level: v }));
                    }
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="اختر المستوى أو أضف جديد" /></SelectTrigger>
                  <SelectContent>
                    {levels.map((lv) => (<SelectItem key={String(lv)} value={String(lv)}>{String(lv)}</SelectItem>))}
                    <SelectItem value="__add_new__" className="text-blue-600 font-medium">
                      + إضافة مستوى جديد
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="sm:col-span-2">
              <Label>إحداثيات GPS</Label>
              <Input value={addForm.GPS_Coordinates || ''} onChange={(e) => setAddForm((p: any) => ({ ...p, GPS_Coordinates: e.target.value }))} placeholder="lat, lng" />
            </div>
            
            {/* Image Upload Section for Add */}
            <div className="sm:col-span-2">
              <Label>صورة اللوحة</Label>
              <div className="space-y-2">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageSelect(e, false)}
                />
                <Input
                  placeholder="أو أدخل رابط الصورة (اختياري)"
                  value={addForm.Image_URL || ''}
                  onChange={(e) => setAddForm((p: any) => ({ ...p, Image_URL: e.target.value }))}
                />
                {imagePreview && (
                  <div className="w-full h-48 bg-muted rounded-lg overflow-hidden">
                    <img
                      src={imagePreview}
                      alt="معاينة الصورة"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                {addForm.image_name && (
                  <div className="text-sm text-muted-foreground">
                    اسم الملف: {addForm.image_name}
                  </div>
                )}
              </div>
            </div>

            <div className="sm:col-span-2">
              <div className="flex items-center gap-3">
                <Label>لوحة شراكة</Label>
                <input type="checkbox" checked={!!addForm.is_partnership} onChange={(e)=> setAddForm((p:any)=>({...p, is_partnership: e.target.checked}))} />
              </div>
            </div>

            {addForm.is_partnership && (
              <>
                <div className="sm:col-span-2">
                  <Label>الشركات المشاركة (فصل بالفواصل)</Label>
                  <Input value={(Array.isArray(addForm.partner_companies)? addForm.partner_companies.join(', ') : addForm.partner_companies || '')} onChange={(e)=> setAddForm((p:any)=>({...p, partner_companies: e.target.value}))} />
                </div>
                <div>
                  <Label>رأس مال اللوحة</Label>
                  <Input type="number" value={addForm.capital || 0} onChange={(e)=> setAddForm((p:any)=>({...p, capital: Number(e.target.value)}))} />
                </div>
                <div>
                  <Label>المتبقي من رأس المال</Label>
                  <Input type="number" value={addForm.capital_remaining || addForm.capital || 0} onChange={(e)=> setAddForm((p:any)=>({...p, capital_remaining: Number(e.target.value)}))} />
                </div>
              </>
            )}

            {/* Display generated name preview */}
            {addForm.Municipality && addForm.Level && addForm.Size && (
              <div className="sm:col-span-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <Label className="text-blue-800 font-medium">الاسم المقترح:</Label>
              <div className="text-blue-600 font-mono text-lg mt-1">
                {generateBillboardName(addForm.Municipality, addForm.ID)}
              </div>
            </div>
            )}

          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => {
              setAddOpen(false);
              setImagePreview('');
            }}>إلغاء</Button>
            <Button onClick={addBillboard} disabled={adding}>{adding ? 'جاري الإضافة...' : 'إضافة'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}