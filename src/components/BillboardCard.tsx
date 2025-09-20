import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Calendar, Building, Eye, User, FileText, Clock } from 'lucide-react';
import { Billboard } from '@/types';
import { formatGregorianDate } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

interface BillboardGridCardProps {
  billboard: Billboard & {
    contract?: {
      id: string;
      customer_name: string;
      ad_type: string;
      start_date: string;
      end_date: string;
      rent_cost: number;
    };
  };
  onBooking?: (billboard: Billboard) => void;
  onViewDetails?: (billboard: Billboard) => void;
  showBookingActions?: boolean;
}

export const BillboardGridCard: React.FC<BillboardGridCardProps> = ({
  billboard,
  onBooking,
  onViewDetails,
  showBookingActions = true
}) => {
  const { isAdmin } = useAuth();
  
  // استخدام بيانات العقد المرتبط أو البيانات المباشرة في اللوحة
  const contractInfo = billboard.contract;
  const customerName = contractInfo?.customer_name || billboard.Customer_Name || '';
  const adType = contractInfo?.ad_type || '';
  const startDate = contractInfo?.start_date || billboard.Rent_Start_Date || '';
  const endDate = contractInfo?.end_date || billboard.Rent_End_Date || '';
  const contractId = contractInfo?.id || billboard.Contract_Number || '';

  // تحديد حالة اللوحة
  const hasActiveContract = !!(contractInfo || billboard.Contract_Number);
  const isAvailable = !hasActiveContract || billboard.Status === 'متاح' || billboard.Status === 'available';
  const isMaintenance = billboard.Status === 'صيانة' || billboard.Status === 'maintenance';
  
  let statusLabel = 'متاح';
  let statusClass = 'bg-green-500 hover:bg-green-600';
  
  if (isMaintenance) {
    statusLabel = 'صيانة';
    statusClass = 'bg-amber-500 hover:bg-amber-600';
  } else if (hasActiveContract && !isAvailable) {
    statusLabel = 'محجوز';
    statusClass = 'bg-red-500 hover:bg-red-600';
  }

  // حساب الأيام المتبقية
  const getDaysRemaining = () => {
    if (!endDate) return null;

    try {
      const endDateObj = new Date(endDate);
      const today = new Date();
      const diffTime = endDateObj.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      return diffDays > 0 ? diffDays : 0;
    } catch {
      return null;
    }
  };

  const daysRemaining = getDaysRemaining();
  const isNearExpiry = daysRemaining !== null && daysRemaining <= 20 && daysRemaining > 0;

  const initialLocal = (billboard as any).image_name ? `/image/${(billboard as any).image_name}` : ((billboard.Image_URL && billboard.Image_URL.startsWith('/')) ? billboard.Image_URL : ((billboard.Image_URL && !billboard.Image_URL.startsWith('http')) ? `/image/${billboard.Image_URL}` : ''));
  const remoteUrl = (billboard as any).Image_URL && (billboard as any).Image_URL.startsWith('http') ? (billboard as any).Image_URL : '';
  const [imgSrc, setImgSrc] = React.useState<string>(initialLocal || remoteUrl || '');

  return (
    <Card className="overflow-hidden rounded-2xl bg-gradient-card border-0 shadow-card hover:shadow-luxury transition-smooth">
      <div className="relative">
        {/* صورة اللوحة */}
        <div className="aspect-video bg-muted relative overflow-hidden">
          {imgSrc ? (
            <img
              src={imgSrc}
              alt={billboard.Billboard_Name}
              className="w-full h-full object-cover"
              onError={() => {
                if (remoteUrl && imgSrc !== remoteUrl) {
                  setImgSrc(remoteUrl);
                } else {
                  setImgSrc('');
                }
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/60">
              <Building className="h-12 w-12 text-muted-foreground" />
            </div>
          )}

          {/* حجم اللوحة */}
          <div className="absolute top-3 right-3">
            <Badge variant="secondary" className="bg-primary/90 text-primary-foreground">
              {billboard.Size}
            </Badge>
          </div>

          {/* حالة اللوحة */}
          <div className="absolute top-3 left-3">
            <Badge
              variant={isAvailable ? "default" : "destructive"}
              className={statusClass}
            >
              {statusLabel}
            </Badge>
          </div>

          {/* تحذير القريبة من الانتهاء */}
          {isNearExpiry && (
            <div className="absolute bottom-3 right-3">
              <Badge variant="outline" className="bg-yellow-500/90 text-yellow-900 border-yellow-600">
                <Calendar className="h-3 w-3 mr-1" />
                {daysRemaining} يوم متبقي
              </Badge>
            </div>
          )}
        </div>

        <CardContent className="p-4">
          {/* معرف اللوحة */}
          <div className="mb-3">
            <h3 className="font-extrabold text-2xl md:text-3xl text-foreground tracking-tight">
              {billboard.Billboard_Name || `لوحة رقم ${billboard.ID}`}
            </h3>
          </div>

          {/* الموقع */}
          <div className="space-y-2 mb-4">
            {/* أقرب نقطة دالة */}
            {(billboard.Nearest_Landmark || billboard.District || billboard.Municipality) && (
              <div className="flex items-center text-lg text-foreground font-semibold">
                <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
                <span className="truncate">{billboard.Nearest_Landmark || billboard.District || billboard.Municipality}</span>
              </div>
            )}

            {/* المنطقة + البلدية */}
            {(billboard.District || billboard.Municipality) && (
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {billboard.District && (
                  <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5">{billboard.District}</span>
                )}
                {billboard.Municipality && (
                  <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5">{billboard.Municipality}</span>
                )}
              </div>
            )}
          </div>

          {/* معلومات إضافية */}
          <div className="mb-4 text-sm space-y-1">
            <div>
              <span className="text-muted-foreground">عدد الأوجه:</span>{' '}
              <span className="font-medium">{billboard.Faces_Count || '1'}</span>
            </div>
          </div>

          {/* معلومات العقد المحسنة - تنسيق يمين ويسار */}
          {hasActiveContract && (
            <div className="mb-4 p-3 bg-muted/50 rounded-lg border">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="h-4 w-4 text-primary" />
                <span className="font-semibold text-sm">معلومات العقد</span>
              </div>
              
              {/* الصف الأول: اسم العميل ورقم العقد */}
              <div className="grid grid-cols-2 gap-4 mb-2">
                {customerName && (
                  <div className="flex items-center gap-2 text-xs">
                    <User className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    <div className="flex flex-col">
                      <span className="text-muted-foreground">العميل:</span>
                      <span className="font-medium text-foreground">{customerName}</span>
                    </div>
                  </div>
                )}
                
                {contractId && (
                  <div className="flex items-center gap-2 text-xs">
                    <FileText className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    <div className="flex flex-col">
                      <span className="text-muted-foreground">رقم العقد:</span>
                      <Badge variant="outline" className="text-xs w-fit">{contractId}</Badge>
                    </div>
                  </div>
                )}
              </div>

              {/* الصف الثاني: نوع الإعلان والأيام المتبقية */}
              <div className="grid grid-cols-2 gap-4 mb-2">
                {adType && (
                  <div className="flex items-center gap-2 text-xs">
                    <Building className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    <div className="flex flex-col">
                      <span className="text-muted-foreground">نوع الإعلان:</span>
                      <Badge variant="outline" className="text-xs w-fit font-medium">{adType}</Badge>
                    </div>
                  </div>
                )}

                {daysRemaining !== null && (
                  <div className="flex items-center gap-2 text-xs">
                    <Clock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    <div className="flex flex-col">
                      <span className="text-muted-foreground">متبقي:</span>
                      <Badge 
                        variant={isNearExpiry ? "destructive" : "secondary"} 
                        className="text-xs w-fit"
                      >
                        {daysRemaining} يوم
                      </Badge>
                    </div>
                  </div>
                )}
              </div>

              {/* الصف الثالث: تاريخ البداية والنهاية */}
              <div className="grid grid-cols-2 gap-4">
                {startDate && (
                  <div className="flex items-center gap-2 text-xs">
                    <Calendar className="h-3 w-3 text-green-600 flex-shrink-0" />
                    <div className="flex flex-col">
                      <span className="text-muted-foreground">يبدأ:</span>
                      <span className="font-medium text-foreground">{formatGregorianDate(startDate, 'ar-LY')}</span>
                    </div>
                  </div>
                )}
                
                {endDate && (
                  <div className="flex items-center gap-2 text-xs">
                    <Calendar className="h-3 w-3 text-red-600 flex-shrink-0" />
                    <div className="flex flex-col">
                      <span className="text-muted-foreground">ينتهي:</span>
                      <div className="flex items-center gap-1">
                        <span className="font-medium text-foreground">{formatGregorianDate(endDate, 'ar-LY')}</span>
                        {isNearExpiry && (
                          <Badge variant="outline" className="text-orange-600 border-orange-600 text-xs">
                            قريب الانتهاء
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* قيمة الإيجار */}
              {contractInfo?.rent_cost && (
                <div className="mt-2 pt-2 border-t border-muted">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">قيمة الإيجار:</span>
                    <span className="font-bold text-primary">{contractInfo.rent_cost.toLocaleString()} د.ل</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* معلومات العقد للمدير فقط (النسخة القديمة للتوافق) */}
          {isAdmin && !hasActiveContract && (contractId || endDate || customerName) && (
            <div className="mb-4 text-xs text-muted-foreground">
              <div className="flex flex-wrap gap-2">
                {contractId && (
                  <Badge variant="outline">رقم العقد: {contractId}</Badge>
                )}
                {endDate && (
                  <Badge variant="secondary">ينتهي: {formatGregorianDate(endDate, 'ar-LY')}</Badge>
                )}
                {customerName && (
                  <Badge variant="outline">{customerName}</Badge>
                )}
              </div>
            </div>
          )}

          {/* أزرار الإجراءات */}
          {showBookingActions && (
            <div className="flex gap-2">
              <Button
                size="sm"
                className="flex-1"
                variant={isAvailable ? "default" : "secondary"}
                onClick={() => onBooking?.(billboard)}
              >
                {isAvailable ? 'حجز سريع' : 'تفريغ'}
              </Button>
              
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => {
                  if (billboard.GPS_Link) {
                    window.open(billboard.GPS_Link, '_blank');
                  }
                }}
                disabled={!billboard.GPS_Link}
              >
                <MapPin className="h-4 w-4" />
              </Button>
              
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => onViewDetails?.(billboard)}
              >
                <Eye className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </div>
    </Card>
  );
};
