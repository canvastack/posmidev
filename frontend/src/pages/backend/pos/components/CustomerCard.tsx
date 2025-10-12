import { X, User, Phone, Mail } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

interface CustomerCardProps {
  customerId: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  onRemove: () => void;
}

/**
 * CustomerCard Component
 * Displays selected customer info in POS cart with remove button
 * 
 * Features:
 * - Shows customer name (primary)
 * - Optional phone/email display
 * - Quick remove button
 * - Glass card design with border
 */
export const CustomerCard = ({ 
  customerId, 
  customerName, 
  customerPhone, 
  customerEmail, 
  onRemove 
}: CustomerCardProps) => {
  return (
    <div className="glass-card border border-primary/30 rounded-lg p-3 mb-3">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-2 flex-1">
          {/* Icon */}
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
            <User className="h-4 w-4 text-primary" />
          </div>
          
          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-sm truncate">{customerName}</span>
              <Badge variant="success" className="text-xs">Member</Badge>
            </div>
            
            {/* Contact Info */}
            <div className="space-y-0.5">
              {customerPhone && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Phone className="h-3 w-3" />
                  <span>{customerPhone}</span>
                </div>
              )}
              {customerEmail && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Mail className="h-3 w-3" />
                  <span className="truncate">{customerEmail}</span>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Remove Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="h-7 w-7 p-0 hover:bg-destructive/10 hover:text-destructive shrink-0"
          title="Remove customer"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};