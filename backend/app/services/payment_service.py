import hashlib
import uuid
from app.core.config import settings

def generate_txnid() -> str:
    """Generate a unique transaction ID for PayU."""
    return uuid.uuid4().hex[:20]

def generate_payu_hash(txnid: str, amount: str, productinfo: str, firstname: str, email: str, udf1: str = "", udf2: str = "") -> str:
    """
    Generate the outbound SHA512 hash request signature.
    PayU Format: sha512(key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||SALT)
    """
    # Note: up to udf5 can be provided, we leave 3, 4, 5 empty
    hash_sequence = f"{settings.PAYU_KEY}|{txnid}|{amount}|{productinfo}|{firstname}|{email}|{udf1}|{udf2}|||||||||{settings.PAYU_SALT}"
    return hashlib.sha512(hash_sequence.encode('utf-8')).hexdigest().lower()

def verify_payu_hash(form_data: dict) -> bool:
    """
    Verify the inbound SHA512 hash response signature from PayU.
    PayU Format returned: sha512(SALT|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key)
    """
    status = form_data.get("status", "")
    key = form_data.get("key", settings.PAYU_KEY.strip())
    txnid = form_data.get("txnid", "")
    amount = form_data.get("amount", "")
    productinfo = form_data.get("productinfo", "")
    firstname = form_data.get("firstname", "")
    email = form_data.get("email", "")
    udf1 = form_data.get("udf1", "")
    udf2 = form_data.get("udf2", "")
    udf3 = form_data.get("udf3", "")
    udf4 = form_data.get("udf4", "")
    udf5 = form_data.get("udf5", "")
    
    salt = settings.PAYU_SALT.strip()
    
    # Check if a custom 'additionalCharges' was applied by payU (rare, but mandated by docs to check)
    additional_charges = form_data.get("additionalCharges")
    
    if additional_charges:
        hash_sequence = f"{additional_charges}|{salt}|{status}||||||{udf5}|{udf4}|{udf3}|{udf2}|{udf1}|{email}|{firstname}|{productinfo}|{amount}|{txnid}|{key}"
    else:
        hash_sequence = f"{salt}|{status}||||||{udf5}|{udf4}|{udf3}|{udf2}|{udf1}|{email}|{firstname}|{productinfo}|{amount}|{txnid}|{key}"
        
    calculated_hash = hashlib.sha512(hash_sequence.encode('utf-8')).hexdigest().lower()
    received_hash = form_data.get("hash", "").lower()
    
    if calculated_hash != received_hash:
        import structlog
        log = structlog.get_logger()
        log.warning("payu.hash_mismatch_debug", 
            calculated=calculated_hash, 
            received=received_hash, 
            sequence=hash_sequence, 
            form_data=form_data)
            
    return calculated_hash == received_hash

def get_payu_endpoint() -> str:
    """Return the correct PayU endpoint depending on the environment."""
    if settings.PAYU_ENV == "live":
        return "https://secure.payu.in/_payment"
    return "https://test.payu.in/_payment"
