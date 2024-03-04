import qrcode

def qr_to_array(qr):
    qr_matrix = qr.get_matrix()
    qr_array = []
    for row in qr_matrix:
        qr_row = [0 if pixel == 0 else 1 for pixel in row]
        qr_array.append(qr_row)
    return qr_array

# Створення QR-коду без рамки
qr = qrcode.QRCode(version=1, error_correction=qrcode.constants.ERROR_CORRECT_L, box_size=10, border=0)
qr.add_data("hello")
qr.make(fit=True)

# Отримання масиву з QR-коду
qr_array = qr_to_array(qr)

# Виведення масиву у форматі JavaScript
print("const QRCODE = [")
for row in qr_array:
    print(f"    [{','.join(str(pixel) for pixel in row)}],")
print("]")
