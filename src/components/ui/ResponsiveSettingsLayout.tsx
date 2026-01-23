'use client';

import { useState, ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';
import { Tabs } from './Tabs';
import { Accordion } from './Accordion';

interface SettingsSection {
  id: string;
  label: string;
  icon: LucideIcon;
  content: ReactNode;
}

interface ResponsiveSettingsLayoutProps {
  sections: SettingsSection[];
  defaultSection?: string;
}

export function ResponsiveSettingsLayout({
  sections,
  defaultSection,
}: ResponsiveSettingsLayoutProps) {
  const [activeTab, setActiveTab] = useState(defaultSection || sections[0]?.id || '');

  // Prepare tabs for desktop view
  const tabs = sections.map((section) => ({
    id: section.id,
    label: section.label,
    icon: section.icon,
  }));

  // Prepare accordion items for mobile view
  const accordionItems = sections.map((section) => ({
    id: section.id,
    title: section.label,
    icon: section.icon,
    content: section.content,
  }));

  // Find active content for desktop
  const activeContent = sections.find((s) => s.id === activeTab)?.content;

  return (
    <>
      {/* Desktop: Tabs */}
      <div className="hidden lg:block">
        <Tabs
          tabs={tabs}
          activeTab={activeTab}
          onChange={setActiveTab}
          className="mb-6"
        />
        <div className="glass rounded-2xl border border-white/10 p-6">
          {activeContent}
        </div>
      </div>

      {/* Mobile: Accordion */}
      <div className="lg:hidden">
        <Accordion
          items={accordionItems}
          defaultOpen={[sections[0]?.id || '']}
          allowMultiple={false}
        />
      </div>
    </>
  );
}
