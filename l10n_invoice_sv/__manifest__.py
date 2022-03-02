# -*- coding: utf-8 -*-
{
    'name': "Facturacion de El Salvador",
    'summary': """Facturacion de El Salvador""",
    'description': """
       Facturacion de El Salvador.
       Permite Imprimir los tres tipos de facturas utilizados en El Salvador
        - Consumidor Final
        - Credito Fiscal
        - Exportaciones
      Tambien permite imprimir los documentos que retifican:
        - Anulaciones.
        - Nota de Credito
        - Anulaciones de Exportacion
      Valida que todos los documentos lleven los registros requeridos por ley
        """,
    'author': "Intelitecsa(Francisco Trejo)",
    'website': "http://www.intelitecsa.com",
    "images": ['static/description/banner.png',
               'static/description/icon.png',
               'static/description/thumbnail.png'],
    'price': 125.00,
    'currency': 'EUR',
    'license': 'GPL-3',
    'category': 'Contabilidad',
    'version': '1.3',
    'depends': ['base', 'l10n_sv', 'account', 'product'],
    'data': [
        'views/account_journal.xml',
        'views/posicion_arancel_view.xml',
        'views/product_template_view.xml',
        'views/account_move_view.xml',
        'views/account_tax.xml',
        'data/journal_data.xml',
        'report/report_invoice_anu.xml',
        'report/report_invoice_ccf.xml',
        'report/report_invoice_fcf.xml',
        'report/report_invoice_exp.xml',
        'report/report_invoice_ndc.xml',
        'report/report_invoice_digital.xml',
        'report/invoice_report.xml',
        'report/report_invoice_main.xml',
        'security/ir.model.access.csv',
        'wizard/account_move_reversal.xml',
    ],
    'demo': [],
    'installable': True,
    'application': False,
    'auto_install': False,
    'post_init_hook': 'set_data',
}
