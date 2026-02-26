import { httpClient } from '@/lib/http';

export interface CitiesData {
    hotCities: string[];
    alphabet: string[];
    allCities: Record<string, string[]>;
}

export const getCitiesApi = () => {
    return httpClient.get<CitiesData>('/cities');
};
