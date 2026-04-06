import asyncio
import os
import sys

# Ensure backend root is in PYTHONPATH
sys.path.append(os.path.dirname(__file__))

from app.core.config import settings
from app.services.storage_service import StorageService

async def main():
    storage = await StorageService.get_instance()
    print("Testing Storage Backend:", type(storage).__name__)
    
    bucket = "datasets"
    obj_name = "test/mock.csv"
    content = b"col1,col2\n1,2\n"
    
    print("Uploading...")
    await storage.upload_bytes(bucket, obj_name, content, "text/csv")
    print("Upload complete.")
    
    print("Downloading...")
    data = await storage.download_bytes(bucket, obj_name)
    print("Download matching:", data == content)
    
    print("Presigned URL:", await storage.presigned_url(bucket, obj_name))
    
    print("Listing...")
    objs = await storage.list_objects(bucket, "test/")
    print("Found objs:", objs)
    
    print("Deleting...")
    await storage.delete_object(bucket, obj_name)
    objs = await storage.list_objects(bucket, "test/")
    print("Post-delete objs:", objs)

if __name__ == "__main__":
    asyncio.run(main())
