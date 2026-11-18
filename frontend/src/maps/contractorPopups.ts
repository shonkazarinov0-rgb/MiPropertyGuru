// Runs inside the Leaflet WebView. Build user-provided content with DOM APIs,
// never HTML interpolation. Group nearby screen positions at every zoom level.
export const contractorPopupScript = String.raw`
var contractorLayer = L.layerGroup().addTo(map);
function textNode(tag, className, value) {
  var node = document.createElement(tag);
  node.className = className;
  node.textContent = value;
  return node;
}
function contractorPreview(m) {
  var card = document.createElement('button');
  card.type = 'button';
  card.className = 'contractor-preview';
  card.setAttribute('aria-label', 'View profile for ' + m.name);
  var avatar = textNode('span', 'preview-avatar', (m.name || '?').split(' ').map(function(n){return n[0] || '';}).join('').slice(0,2));
  if (m.photo && /^https:\/\//i.test(m.photo)) {
    var img = document.createElement('img');
    img.src = m.photo;
    img.alt = '';
    img.onerror = function(){ img.remove(); };
    avatar.appendChild(img);
  }
  card.appendChild(avatar);
  var detail = document.createElement('span');
  detail.appendChild(textNode('strong', 'preview-name', m.name || 'Contractor'));
  detail.appendChild(textNode('span', 'preview-trade', m.type || 'Contractor'));
  var facts = [];
  if (Number(m.rating) > 0) facts.push('★ ' + Number(m.rating).toFixed(1));
  if (m.distance !== null && m.distance !== undefined && isFinite(Number(m.distance))) facts.push(Number(m.distance).toFixed(1) + ' km away');
  detail.appendChild(textNode('span', 'preview-facts', facts.join(' · ')));
  card.appendChild(detail);
  card.onclick = function(event) {
    event.stopPropagation();
    window.ReactNativeWebView.postMessage(JSON.stringify({type:'profile',id:m.id}));
  };
  return card;
}
function groupContractors(markers) {
  var groups = [];
  markers.forEach(function(m) {
    var point = map.latLngToContainerPoint([m.lat, m.lng]);
    var group = groups.find(function(g) { return point.distanceTo(g.point) < 24; });
    if (group) group.members.push(m);
    else groups.push({point:point, members:[m]});
  });
  return groups;
}
function renderContractors() {
  contractorLayer.clearLayers();
  groupContractors(ms).forEach(function(group) {
    var members = group.members;
    var m = members[0];
    var content = document.createElement('div');
    content.className = 'contractor-list';
    if (members.length > 1) content.appendChild(textNode('strong', 'preview-group', members.length + ' contractors here'));
    members.forEach(function(member){content.appendChild(contractorPreview(member));});
    var count = members.length > 1 ? String(members.length) : '';
    var icon = L.divIcon({className:'',html:'<div class="contractor-dot' + (count ? ' grouped' : '') + '">' + count + '</div>',iconSize:[24,24],iconAnchor:[12,12]});
    L.marker([m.lat,m.lng],{icon:icon}).addTo(contractorLayer).bindPopup(content, {
      closeButton:true, autoClose:true, closeOnClick:true, autoPan:true,
      autoPanPadding:[16,16], maxWidth:270, minWidth:200, className:'contractor-popup'
    });
  });
}
renderContractors();
map.on('zoomend', renderContractors);
`;
