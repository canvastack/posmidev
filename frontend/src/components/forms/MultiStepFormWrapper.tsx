import React, { useState, useEffect, ReactNode } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DialogFooter } from '@/components/ui/dialog';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface TabConfig {
  id: string;
  label: string;
  content: ReactNode;
  validateFields?: string[];
}

interface MultiStepFormWrapperProps {
  tabs: TabConfig[];
  form: UseFormReturn<any>;
  onSubmit: (data: any) => void | Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  mode: 'create' | 'edit';
  submitLabel?: string;
  onTabChange?: (tabId: string) => void;
  extraActions?: ReactNode;
}

/**
 * Reusable Multi-Step Form Wrapper with Tab Navigation
 * 
 * Features:
 * - Sequential tab validation (can only proceed after validation)
 * - Back/Next navigation buttons
 * - Reset button (shows only when form is dirty)
 * - Auto-handles form submission prevention on Enter key
 * - Fully accessible and keyboard-friendly
 * 
 * @example
 * ```tsx
 * const tabs = [
 *   { id: 'basic', label: 'Basic Info', content: <BasicFields />, validateFields: ['name', 'email'] },
 *   { id: 'details', label: 'Details', content: <DetailFields />, validateFields: ['phone'] },
 *   { id: 'confirm', label: 'Confirm', content: <ConfirmFields /> },
 * ];
 * 
 * <MultiStepFormWrapper
 *   tabs={tabs}
 *   form={form}
 *   onSubmit={handleSubmit}
 *   onCancel={() => setOpen(false)}
 *   mode="create"
 * />
 * ```
 */
export function MultiStepFormWrapper({
  tabs,
  form,
  onSubmit,
  onCancel,
  isLoading = false,
  mode,
  submitLabel,
  onTabChange,
  extraActions,
}: MultiStepFormWrapperProps) {
  const [currentTab, setCurrentTab] = useState(tabs[0].id);
  const [validatedTabs, setValidatedTabs] = useState<Set<string>>(
    new Set(mode === 'edit' ? tabs.map(t => t.id) : [tabs[0].id])
  );

  const currentTabIndex = tabs.findIndex(tab => tab.id === currentTab);
  const isFirstTab = currentTabIndex === 0;
  const isLastTab = currentTabIndex === tabs.length - 1;

  const { trigger, reset, formState: { isDirty } } = form;

  // Reset validated tabs when mode changes
  useEffect(() => {
    if (mode === 'edit') {
      setValidatedTabs(new Set(tabs.map(t => t.id)));
    } else {
      setValidatedTabs(new Set([tabs[0].id]));
      setCurrentTab(tabs[0].id);
    }
  }, [mode, tabs]);

  // Validate current tab before moving to next
  const validateTab = async (tabId: string): Promise<boolean> => {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab?.validateFields || tab.validateFields.length === 0) {
      return true; // No validation required for this tab
    }

    const isValid = await trigger(tab.validateFields as any);
    return isValid;
  };

  const handleNext = async () => {
    const isValid = await validateTab(currentTab);
    if (!isValid) {
      toast.error('Please fill in all required fields correctly');
      return;
    }

    // Move to next tab and mark it as validated
    if (currentTabIndex < tabs.length - 1) {
      const nextTab = tabs[currentTabIndex + 1];
      setValidatedTabs(prev => new Set([...prev, nextTab.id]));
      setCurrentTab(nextTab.id);
      onTabChange?.(nextTab.id);
    }
  };

  const handleBack = () => {
    if (currentTabIndex > 0) {
      const prevTab = tabs[currentTabIndex - 1];
      setCurrentTab(prevTab.id);
      onTabChange?.(prevTab.id);
    }
  };

  const handleReset = () => {
    reset();
    setCurrentTab(tabs[0].id);
    setValidatedTabs(new Set(mode === 'edit' ? tabs.map(t => t.id) : [tabs[0].id]));
    toast.info('Form has been reset');
  };

  const handleTabSwitch = (value: string) => {
    // Only allow switching to validated tabs
    if (validatedTabs.has(value)) {
      setCurrentTab(value);
      onTabChange?.(value);
    }
  };

  // Prevent form submission on Enter key (except when Submit button is focused)
  const handleFormKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Enter' && e.target instanceof HTMLElement) {
      // Allow Enter on textarea
      if (e.target.tagName === 'TEXTAREA') {
        return;
      }
      
      // Allow Enter on Submit button
      if (e.target.tagName === 'BUTTON' && e.target.getAttribute('type') === 'submit') {
        return;
      }

      // Prevent form submission on Enter
      e.preventDefault();
      
      // If not on last tab, trigger Next button
      if (!isLastTab) {
        handleNext();
      }
    }
  };

  return (
    <form 
      onSubmit={form.handleSubmit(onSubmit)} 
      onKeyDown={handleFormKeyDown}
      className="space-y-6"
    >
      <Tabs value={currentTab} onValueChange={handleTabSwitch} className="w-full">
        <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
          {tabs.map((tab) => (
            <TabsTrigger 
              key={tab.id} 
              value={tab.id} 
              disabled={!validatedTabs.has(tab.id)}
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {tabs.map((tab) => (
          <TabsContent key={tab.id} value={tab.id} className="space-y-4 mt-4">
            {tab.content}
          </TabsContent>
        ))}
      </Tabs>

      <DialogFooter className="flex justify-between items-center">
        <div className="flex gap-2">
          {!isFirstTab && (
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              disabled={isLoading}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          )}
        </div>

        <div className="flex gap-2">
          {isDirty && (
            <Button
              type="button"
              variant="ghost"
              onClick={handleReset}
              disabled={isLoading}
            >
              Reset
            </Button>
          )}
          
          {extraActions}
          
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>

          {!isLastTab ? (
            <Button
              type="button"
              onClick={handleNext}
              disabled={isLoading}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : submitLabel || (mode === 'create' ? 'Create' : 'Update')}
            </Button>
          )}
        </div>
      </DialogFooter>
    </form>
  );
}