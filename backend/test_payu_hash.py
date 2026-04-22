import hashlib
import uuid

salt='S6P5ymVvOrixgAXLLkcVnchIjt69FuBk'
key='Eip2Id'
txnid='ab123456'
amount='29.00'
product='Plan'
first='User'
email='u@u.com'
udf1='udf1'
udf2='udf2'
udf3=''
udf4=''
udf5=''
status='success'

outbound_str = f"{key}|{txnid}|{amount}|{product}|{first}|{email}|{udf1}|{udf2}|||||||||{salt}"
outbound_hash = hashlib.sha512(outbound_str.encode('utf-8')).hexdigest()
print("Outbound hash:", outbound_hash)

# PayU format returned: sha512(SALT|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key)
# In backend we have:
inbound_str = f"{salt}|{status}||||||{udf5}|{udf4}|{udf3}|{udf2}|{udf1}|{email}|{first}|{product}|{amount}|{txnid}|{key}"
inbound_hash = hashlib.sha512(inbound_str.encode('utf-8')).hexdigest()
print("Inbound hash:", inbound_hash)
