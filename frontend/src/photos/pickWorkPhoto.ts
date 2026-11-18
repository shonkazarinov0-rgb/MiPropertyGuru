import * as ImagePicker from 'expo-image-picker';

// Determine the actual encoding rather than labelling every asset as JPEG.
export function photoDataUri(asset: { base64?: string | null; mimeType?: string | null }) {
  const data = asset.base64;
  if (!data) throw new Error('The photo could not be loaded. Download it from iCloud and try again.');
  let mime = asset.mimeType || 'image/jpeg';
  if (data.startsWith('/9j/')) mime = 'image/jpeg';
  else if (data.startsWith('iVBORw0KGgo')) mime = 'image/png';
  else if (data.startsWith('R0lGOD')) mime = 'image/gif';
  else if (data.startsWith('UklGR')) mime = 'image/webp';
  if (!/^image\/[a-z0-9.+-]+$/i.test(mime)) throw new Error('Please select an image.');
  return `data:${mime};base64,${data}`;
}

export async function pickWorkPhoto() {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Allow photo access in Settings to add photos. Limited access to selected photos is enough.');
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: false,
    preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
    quality: 0.7,
    base64: true,
  });
  if (result.canceled) return null;
  const asset = result.assets?.[0];
  if (!asset) throw new Error('No photo was returned. Please select the photo again.');
  return photoDataUri(asset);
}
