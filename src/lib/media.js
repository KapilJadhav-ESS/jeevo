// Reports, photos and documents: kept inline on the device in demo mode,
// uploaded to a PRIVATE Supabase Storage bucket in cloud mode (opened via signed links).
import { CLOUD } from './config'
import { uploadDataUrl, signedUrl } from './cloud'
import { db } from './db'

export const storeMedia = (dataUrl, name) => (CLOUD ? uploadDataUrl(db.hospitalId, dataUrl, name) : Promise.resolve(dataUrl))
export const mediaUrl = (ref) => (CLOUD ? signedUrl(ref) : Promise.resolve(ref))
