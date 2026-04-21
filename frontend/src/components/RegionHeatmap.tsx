import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import type { Feature } from "geojson";

interface Props {
  geoData: object | null;
  valueMap: Record<string, number>;
  onRegionClick?: (name: string) => void;
}

function getColor(value: number, max: number): string {
  const ratio = max > 0 ? value / max : 0;
  const r = Math.round(255 * ratio);
  const b = Math.round(255 * (1 - ratio));
  return `rgb(${r},50,${b})`;
}

export default function RegionHeatmap({ geoData, valueMap, onRegionClick }: Props) {
  const max = Math.max(...Object.values(valueMap), 1);

  const style = (feature?: Feature) => {
    const name = (feature?.properties as any)?.name ?? "";
    const value = valueMap[name] ?? 0;
    return {
      fillColor: getColor(value, max),
      fillOpacity: 0.6,
      color: "#fff",
      weight: 1,
    };
  };

  const onEach = (feature: Feature, layer: L.Layer) => {
    const name = (feature.properties as any)?.name ?? "";
    const value = valueMap[name];
    layer.bindPopup(`${name}: ${value ? value.toLocaleString() + "원" : "데이터 없음"}`);
    if (onRegionClick) {
      layer.on("click", () => onRegionClick(name));
    }
  };

  return (
    <MapContainer center={[36.5, 127.5]} zoom={7} style={{ height: 500, width: "100%" }}>
      <TileLayer
        attribution='&copy; OpenStreetMap'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {geoData && <GeoJSON data={geoData as any} style={style} onEachFeature={onEach} />}
    </MapContainer>
  );
}
