/* The globe's sheet in the footprint map's manner, its slow part (globe3d.js, paint 'footprint', 2026-11-09):
   the paper, the sea engraved in rings round every coast (close and dark by the shore, thinning out to sea),
   the land laid over them and a faint graticule. Painted here, off the page, so the footprint map's arrival
   above keeps its pace; the page gets back one finished picture (an ImageBitmap) and lays the washes and
   the ink over it itself. Message in: { land, TW, TH, paper, water, ink }; out: { bitmap }. */
importScripts('../../vendor/d3.min.js');

onmessage = (e) => {
  const { land, TW, TH, paper, water, ink } = e.data;
  const eq = d3.geoEquirectangular().scale(TW / (Math.PI * 2)).translate([TW / 2, TH / 2]).precision(0.2);
  const big = new OffscreenCanvas(TW, TH), c = big.getContext('2d'), path = d3.geoPath(eq, c);
  c.fillStyle = paper; c.fillRect(0, 0, TW, TH);
  // each ring: a wide stroke round the land with a narrower one rubbed out of it
  const ring = new OffscreenCanvas(TW, TH), rc = ring.getContext('2d'), rp = d3.geoPath(eq, rc);
  rc.lineJoin = 'round';
  const RINGS = d3.range(12).map((i) => 4 + i * 5 + i * i * 0.25);
  RINGS.forEach((d, i) => {
    rc.globalCompositeOperation = 'source-over'; rc.clearRect(0, 0, TW, TH);
    rc.strokeStyle = '#000'; rc.lineWidth = 2 * d + 2; rc.beginPath(); rp(land); rc.stroke();
    rc.globalCompositeOperation = 'destination-out'; rc.lineWidth = 2 * d; rc.beginPath(); rp(land); rc.stroke();
    rc.globalCompositeOperation = 'source-in'; rc.fillStyle = water; rc.fillRect(0, 0, TW, TH);
    c.globalAlpha = 0.44 * Math.pow(1 - i / RINGS.length, 1.3) + 0.04; c.drawImage(ring, 0, 0); c.globalAlpha = 1;
  });
  c.fillStyle = paper; c.beginPath(); path(land); c.fill();
  // the graticule, every fifteen degrees, the equator a shade firmer
  c.strokeStyle = ink; c.lineWidth = 1.05; c.globalAlpha = 0.15; c.beginPath();
  path(d3.geoGraticule().step([15, 15]).extentMinor([[-180, -75.01], [180, 75.01]])()); c.stroke();
  c.globalAlpha = 0.28; c.beginPath(); path({ type: 'LineString', coordinates: d3.range(-180, 181, 2).map((lon) => [lon, 0]) }); c.stroke();
  const bitmap = big.transferToImageBitmap();
  postMessage({ bitmap }, [bitmap]);
};
