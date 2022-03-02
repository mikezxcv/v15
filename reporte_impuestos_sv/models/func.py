# -*- coding: utf-8 -*-


################################################
def search_invoice(self, tipo_doc, tipo, fecha, company_id, ids):
    invoice_obj = self.env['account.move']
    data = [('journal_id.type_report', '=', tipo_doc)]
    if self.type == 'compras':
        data.append(('date', '=', fecha))
    else:
        data.append(('invoice_date', '=', fecha))
    data.append(('company_id', '=', company_id))
    data.append(('state', '=', 'posted'))
    data.append(('move_type', '=', tipo))
    if ids:
        data.append(('id', 'not in', ids))
    invoice_list = invoice_obj.search(data, order="name")
    # print(invoice_list,'###############################')
    return invoice_list


################################################
# comprueba la longitud del numero de la factura
# devuelve el prefijo y la longitud
def numeracion(num):
    res = {}
    i = 0
    n = "0123456789"
    for l in num:
        i += 1
        # print (l,'Letra')
        if l not in n:
            # print (l,"l")
            longitud = i
            # print (longitud,'Longitud')
    res['longitud'] = longitud
    res['pre'] = num[:longitud]
    res['num'] = num[longitud:]
    return res


def limpieza_ccf(self):
    # borramos todo para que cada actualizacion se escriba en limpio
    self.env.cr.execute('DELETE FROM iva_credito_fiscal WHERE libro_iva_id=' + str(self.id))
    return True
