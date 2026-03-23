export interface Recording {
    id: string
    title?: string
    blob?: Blob
    url?: string
    date?: string
    duration?: string
    size?: number
    deleted?: boolean
    call_id?: string
    session_id?: string
}

const DB_NAME = "MeetAI_DB"
const STORE_NAME = "recordings"

export const initDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1)

        request.onerror = () => reject("Error opening database")

        request.onsuccess = (event) => {
            resolve((event.target as IDBOpenDBRequest).result)
        }

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: "id" })
            }
        }
    })
}

export const saveRecording = async (recording: Recording): Promise<void> => {
    const db = await initDB()
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], "readwrite")
        const store = transaction.objectStore(STORE_NAME)
        const request = store.add(recording)

        request.onsuccess = () => resolve()
        request.onerror = () => reject("Error saving recording")
    })
}

export const getRecordings = async (): Promise<Recording[]> => {
    const db = await initDB()
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], "readonly")
        const store = transaction.objectStore(STORE_NAME)
        const request = store.getAll()

        request.onsuccess = () => {
            // Sort by date desc
            const results = request.result as Recording[]
            results.sort((a, b) => new Date(b.date || "").getTime() - new Date(a.date || "").getTime())
            resolve(results)
        }
        request.onerror = () => reject("Error fetching recordings")
    })
}

export const deleteRecording = async (id: string): Promise<void> => {
    const db = await initDB()
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], "readwrite")
        const store = transaction.objectStore(STORE_NAME)
        const request = store.delete(id)

        request.onsuccess = () => resolve()
        request.onerror = () => reject("Error deleting recording")
    })
}

export const updateRecording = async (recording: Recording): Promise<void> => {
    const db = await initDB()
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], "readwrite")
        const store = transaction.objectStore(STORE_NAME)
        
        const getRequest = store.get(recording.id)
        getRequest.onsuccess = () => {
            const existing = getRequest.result || {}
            const merged = { ...existing, ...recording }
            const putRequest = store.put(merged)
            putRequest.onsuccess = () => resolve()
            putRequest.onerror = () => reject("Error updating recording")
        }
        getRequest.onerror = () => reject("Error fetching recording for update")
    })
}
