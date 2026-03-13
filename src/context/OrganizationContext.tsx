import React, { createContext, useContext, useState, useEffect } from 'react';
import { Organization, OrganizationSettings, Location } from '../types';

interface OrganizationContextType {
  organization: Organization | null;
  settings: OrganizationSettings | null;
  locations: Location[];
  loading: boolean;
  error: string | null;
  fetchConfig: (slug: string) => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export const OrganizationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [settings, setSettings] = useState<OrganizationSettings | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = async (slug: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/staff/config/${slug}`);
      if (!res.ok) throw new Error('Organization not found');
      const data = await res.json();
      setOrganization(data.organization);
      setSettings(data.settings);
      setLocations(data.locations);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <OrganizationContext.Provider value={{ organization, settings, locations, loading, error, fetchConfig }}>
      {children}
    </OrganizationContext.Provider>
  );
};

export const useOrganization = () => {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
};
