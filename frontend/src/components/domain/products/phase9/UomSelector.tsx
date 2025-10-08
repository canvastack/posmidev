/**
 * Phase 9: Unit of Measurement (UOM) Selector
 * 
 * IMMUTABLE RULES COMPLIANCE:
 * - Uses design tokens from index.css
 * - Fully supports dark/light mode
 * - Responsive design
 */

import { Label } from '@/components/ui/label';

// Available UOM options (from backend)
const UOM_OPTIONS = [
  { value: 'pcs', label: 'Pieces (pcs)' },
  { value: 'kg', label: 'Kilograms (kg)' },
  { value: 'g', label: 'Grams (g)' },
  { value: 'l', label: 'Liters (l)' },
  { value: 'ml', label: 'Milliliters (ml)' },
  { value: 'm', label: 'Meters (m)' },
  { value: 'cm', label: 'Centimeters (cm)' },
  { value: 'box', label: 'Box' },
  { value: 'pack', label: 'Pack' },
  { value: 'carton', label: 'Carton' },
  { value: 'bottle', label: 'Bottle' },
  { value: 'can', label: 'Can' },
  { value: 'unit', label: 'Unit' },
];

interface UomSelectorProps {
  value: string | null;
  onChange: (value: string | null) => void;
  error?: string;
  disabled?: boolean;
}

export function UomSelector({ value, onChange, error, disabled }: UomSelectorProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="uom">Unit of Measurement (UOM)</Label>
      <select
        id="uom"
        value={value || ''}
        onChange={(e) => onChange(e.target.value || null)}
        disabled={disabled}
        className={`input w-full ${error ? 'border-danger-500 focus:ring-danger-500' : ''}`}
      >
        <option value="">-- No UOM --</option>
        {UOM_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="text-sm text-danger-600 dark:text-danger-400">{error}</p>
      )}
      <p className="text-xs text-muted-foreground">
        Select the unit to display alongside stock quantity
      </p>
    </div>
  );
}