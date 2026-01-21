import { useEffect, useMemo, useRef, useState } from 'react';
import { MapPin, Layers } from 'lucide-react';
import { formatCurrency, mapGradient } from '../utils/format';

function resolveFeatureLevel(props = {}) {
  return props.nivel || props.Nivel || props.level || props.Level || '';
}

function resolveFeatureCode(props = {}) {
  return props.codigo || props.Codigo || props.CODIGO || props.CodIbge || props.cod_ibge || props.id || null;
}

function resolveFeatureName(props = {}) {
  return props.nome || props.Nome || props.Municipio || props.municipio || props.territorio || props.name || 'Sem nome';
}

function normalizeKey(value) {
  if (!value) return '';
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export default function MapChart({ data, geoData, nivel }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layerRef = useRef(null);
  const [metric, setMetric] = useState('media');

  const valuesByCode = useMemo(() => {
    const map = new Map();
    data?.byTerritorio?.forEach(item => {
      if (item.codigo) {
        map.set(String(item.codigo), item);
      }
    });
    return map;
  }, [data]);

  const valuesByName = useMemo(() => {
    const map = new Map();
    data?.byTerritorio?.forEach(item => {
      if (item.territorio) {
        map.set(normalizeKey(item.territorio), item);
      }
    });
    return map;
  }, [data]);

  const filteredGeo = useMemo(() => {
    if (!geoData?.features?.length) return null;
    if (!nivel) return geoData;
    const features = geoData.features.filter(feature => {
      const level = resolveFeatureLevel(feature.properties || {});
      return !level || level === nivel;
    });
    return { ...geoData, features };
  }, [geoData, nivel]);

  const { minVal, maxVal } = useMemo(() => {
    if (!data?.byTerritorio?.length) return { minVal: 0, maxVal: 1 };
    const values = data.byTerritorio.map(d => d[metric]).filter(v => Number.isFinite(v) && v > 0);
    return {
      minVal: Math.min(...values),
      maxVal: Math.max(...values),
    };
  }, [data, metric]);

  useEffect(() => {
    if (!mapRef.current || !filteredGeo || mapInstanceRef.current) return;

    import('leaflet').then(L => {
      const map = L.map(mapRef.current, {
        center: [-24.7, -51.5],
        zoom: 7,
        zoomControl: true,
        scrollWheelZoom: true,
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
      }).addTo(map);

      mapInstanceRef.current = map;
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [filteredGeo]);

  useEffect(() => {
    if (!mapInstanceRef.current || !filteredGeo) return;

    import('leaflet').then(L => {
      if (layerRef.current) {
        mapInstanceRef.current.removeLayer(layerRef.current);
      }

      const getColor = (value) => {
        if (!value || value === 0) return '#f3f4f6';
        const normalized = (value - minVal) / (maxVal - minVal || 1);
        const index = Math.min(Math.floor(normalized * mapGradient.length), mapGradient.length - 1);
        return mapGradient[index];
      };

      const style = (feature) => {
        const props = feature.properties || {};
        const code = resolveFeatureCode(props);
        const name = resolveFeatureName(props);
        const match = valuesByCode.get(String(code)) || valuesByName.get(normalizeKey(name));
        const value = match ? match[metric] : 0;

        return {
          fillColor: getColor(value),
          weight: 1,
          opacity: 1,
          color: '#ffffff',
          fillOpacity: 0.85,
        };
      };

      const onEachFeature = (feature, layer) => {
        const props = feature.properties || {};
        const code = resolveFeatureCode(props);
        const name = resolveFeatureName(props);
        const match = valuesByCode.get(String(code)) || valuesByName.get(normalizeKey(name));
        const value = match ? match[metric] : 0;
        const min = match?.min || 0;
        const max = match?.max || 0;

        layer.bindTooltip(`
          <div style="font-family: system-ui; min-width: 180px;">
            <div style="font-weight: 600; font-size: 14px; margin-bottom: 6px; color: #34444b;">${name}</div>
            <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 2px;">
              <span style="color: #6b7280;">Media:</span>
              <span style="font-weight: 500; color: #62929E;">${formatCurrency(match?.media || 0)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 2px;">
              <span style="color: #6b7280;">Min:</span>
              <span style="font-weight: 500; color: #546A7B;">${formatCurrency(min)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 12px;">
              <span style="color: #6b7280;">Max:</span>
              <span style="font-weight: 500; color: #546A7B;">${formatCurrency(max)}</span>
            </div>
          </div>
        `, {
          className: 'custom-tooltip',
          sticky: true,
        });

        layer.on({
          mouseover: (e) => {
            e.target.setStyle({
              weight: 3,
              color: '#2d4a53',
              fillOpacity: 0.95,
            });
          },
          mouseout: (e) => {
            layerRef.current.resetStyle(e.target);
          },
        });
      };

      const geoLayer = L.geoJSON(filteredGeo, {
        style,
        onEachFeature,
      }).addTo(mapInstanceRef.current);

      layerRef.current = geoLayer;
    });
  }, [filteredGeo, valuesByCode, valuesByName, metric, minVal, maxVal]);

  if (!geoData) {
    return (
      <div className="chart-container">
        <div className="text-sm text-neutral-500">GeoJSON nao encontrado.</div>
      </div>
    );
  }

  return (
    <div className="chart-container">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-water-100 rounded-lg">
            <MapPin className="w-5 h-5 text-water-600" />
          </div>
          <h3 className="section-title">Mapa territorial</h3>
        </div>

        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-earth-400" />
          <select
            value={metric}
            onChange={(e) => setMetric(e.target.value)}
            className="filter-select w-auto"
          >
            <option value="media">Media</option>
            <option value="mediana">Mediana</option>
            <option value="max">Maximo</option>
            <option value="min">Minimo</option>
          </select>
        </div>
      </div>

      <div
        ref={mapRef}
        className="h-[520px] rounded-xl overflow-hidden border border-earth-200"
        style={{ background: '#f8fafc' }}
      />

      <div className="mt-4 flex items-center justify-center gap-4">
        <span className="text-xs text-earth-500">Menor</span>
        <div className="flex h-3 rounded overflow-hidden">
          {mapGradient.map((color, i) => (
            <div key={i} className="w-8 h-full" style={{ backgroundColor: color }} />
          ))}
        </div>
        <span className="text-xs text-earth-500">Maior</span>
      </div>

      <p className="text-xs text-earth-400 text-center mt-2">
        Passe o mouse sobre uma area para ver os detalhes.
      </p>
    </div>
  );
}
