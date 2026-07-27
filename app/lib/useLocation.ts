import { useState, useEffect } from "react";

export interface Province {
  id: string;
  name: string;
}

export interface City {
  id: string;
  province_id: string;
  name: string;
}

export function useLocation() {
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);

  useEffect(() => {
    setLoadingProvinces(true);
    fetch("https://www.emsifa.com/api-wilayah-indonesia/api/provinces.json")
      .then((res) => res.json())
      .then((data) => setProvinces(data))
      .catch((err) => console.error("Failed to load provinces", err))
      .finally(() => setLoadingProvinces(false));
  }, []);

  const loadCitiesByProvinceName = async (provinceName: string) => {
    if (!provinceName) {
      setCities([]);
      return;
    }
    const province = provinces.find((p) => p.name === provinceName);
    if (!province) {
      setCities([]);
      return;
    }
    setLoadingCities(true);
    try {
      const res = await fetch(`https://www.emsifa.com/api-wilayah-indonesia/api/regencies/${province.id}.json`);
      const data = await res.json();
      setCities(data);
    } catch (err) {
      console.error("Failed to load cities", err);
      setCities([]);
    } finally {
      setLoadingCities(false);
    }
  };

  return { provinces, cities, loadCitiesByProvinceName, loadingProvinces, loadingCities, setCities };
}
