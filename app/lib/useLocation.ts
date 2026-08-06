import { useState, useEffect, useCallback } from "react";

export interface Province {
  id: string;
  name: string;
}

export interface City {
  id: string;
  province_id: string;
  name: string;
}

export interface District {
  id: string;
  regency_id: string;
  name: string;
}

export interface Village {
  id: string;
  district_id: string;
  name: string;
}

export function useLocation() {
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [villages, setVillages] = useState<Village[]>([]);
  
  const [loadingProvinces, setLoadingProvinces] = useState(true);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingVillages, setLoadingVillages] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetch("https://www.emsifa.com/api-wilayah-indonesia/api/provinces.json")
        .then((res) => res.json())
        .then((data) => setProvinces(data))
        .catch((err) => console.error("Failed to load provinces", err))
        .finally(() => setLoadingProvinces(false));
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const loadCitiesByProvinceName = useCallback(async (provinceName: string) => {
    if (!provinceName) {
      setCities([]);
      setDistricts([]);
      setVillages([]);
      return;
    }
    const province = provinces.find((p) => p.name === provinceName);
    if (!province) {
      setCities([]);
      setDistricts([]);
      setVillages([]);
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
  }, [provinces]);

  const loadDistrictsByCityName = useCallback(async (cityName: string) => {
    if (!cityName) {
      setDistricts([]);
      setVillages([]);
      return;
    }
    const city = cities.find((c) => c.name === cityName);
    if (!city) {
      setDistricts([]);
      setVillages([]);
      return;
    }
    setLoadingDistricts(true);
    try {
      const res = await fetch(`https://www.emsifa.com/api-wilayah-indonesia/api/districts/${city.id}.json`);
      const data = await res.json();
      setDistricts(data);
    } catch (err) {
      console.error("Failed to load districts", err);
      setDistricts([]);
    } finally {
      setLoadingDistricts(false);
    }
  }, [cities]);

  const loadVillagesByDistrictName = useCallback(async (districtName: string) => {
    if (!districtName) {
      setVillages([]);
      return;
    }
    const district = districts.find((d) => d.name === districtName);
    if (!district) {
      setVillages([]);
      return;
    }
    setLoadingVillages(true);
    try {
      const res = await fetch(`https://www.emsifa.com/api-wilayah-indonesia/api/villages/${district.id}.json`);
      const data = await res.json();
      setVillages(data);
    } catch (err) {
      console.error("Failed to load villages", err);
      setVillages([]);
    } finally {
      setLoadingVillages(false);
    }
  }, [districts]);

  const loadAllForEdit = useCallback(async (provinceName?: string, cityName?: string, districtName?: string) => {
    if (!provinceName) return;

    let currentProvinces = provinces;
    if (currentProvinces.length === 0) {
      try {
        const resP = await fetch("https://www.emsifa.com/api-wilayah-indonesia/api/provinces.json");
        currentProvinces = await resP.json();
        setProvinces(currentProvinces);
      } catch (err) {
        console.error("Failed to load provinces in loadAllForEdit", err);
        return;
      }
    }

    const province = currentProvinces.find((p) => p.name === provinceName);
    if (!province) return;

    setLoadingCities(true);
    try {
      const resCities = await fetch(`https://www.emsifa.com/api-wilayah-indonesia/api/regencies/${province.id}.json`);
      const citiesData: City[] = await resCities.json();
      setCities(citiesData);

      if (!cityName) return;
      const city = citiesData.find((c) => c.name === cityName);
      if (!city) return;

      setLoadingDistricts(true);
      const resDistricts = await fetch(`https://www.emsifa.com/api-wilayah-indonesia/api/districts/${city.id}.json`);
      const districtsData: District[] = await resDistricts.json();
      setDistricts(districtsData);

      if (!districtName) return;
      const district = districtsData.find((d) => d.name === districtName);
      if (!district) return;

      setLoadingVillages(true);
      const resVillages = await fetch(`https://www.emsifa.com/api-wilayah-indonesia/api/villages/${district.id}.json`);
      const villagesData: Village[] = await resVillages.json();
      setVillages(villagesData);

    } catch (err) {
      console.error("Failed to load full location hierarchy", err);
    } finally {
      setLoadingCities(false);
      setLoadingDistricts(false);
      setLoadingVillages(false);
    }
  }, [provinces]);

  return {
    provinces,
    cities,
    districts,
    villages,
    loadCitiesByProvinceName,
    loadDistrictsByCityName,
    loadVillagesByDistrictName,
    loadAllForEdit,
    loadingProvinces,
    loadingCities,
    loadingDistricts,
    loadingVillages,
    setCities,
    setDistricts,
    setVillages,
  };
}
