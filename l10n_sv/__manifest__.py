    # -*- coding: utf-8 -*-
{
    'name': "Localizacion de El Salvador",
    'summary': """Localizacion de El Salvador""",
    'description': """
    Localizacion de El Salvador :
        - Numero de registro comercial
        - Numero de identificacion tributario
        - Documento de Identificacion Unico
        
    Agrega un plan contable basico requerido en El Salvador.
    Agrega categorias de impuestos utilizados en El Salvador.
    Agrega todos los impuestos utilizados en compras y ventas.
    
    Permite generar los tres tipos de facturas utilizados en El Salvador
        - Consumidor Final.
        - Credito Fiscal.
        - Exportaciones.
    
    Tambien permite generar los documentos que retifican:
        - Anulaciones.
        - Nota de Credito.
        - Anulaciones de Exportacion.
        """,
    'author': "Intelitecsa(Francisco Trejo)",
    'website': "http://www.intelitecsa.com",
    "images": ['static/description/banner.png',
               'static/description/icon.png',
               'static/description/thumbnail.png'],
    'price': 125.00,
    'currency': 'EUR',
    'license': 'GPL-3',
    'category': 'Localization',
    'version': '1.1',
    'depends': ['base',
                'base_sv',
                'account',
                'phone_validation',
                'l10n_sv_dpto'],
    'data': [
        'views/view_res_company.xml',
        'views/view_res_partner.xml',
        'views/account_type.xml',
        'data/res_country_data.xml',
        'data/l10n_sv_coa.xml',
        'data/account.account.template.csv',
        'data/account_tax_data.xml',
        'data/account_fiscal_position.xml',
        'data/account_fiscal_position_tax.xml',
        'data/l10n_sv_coa_post.xml',
        'data/journal_data.xml',
    ],
    'demo': [
        #'demo.xml',
    ],
    'installable': True,
    'application': False,
    'auto_install': False,
    'post_init_hook': 'drop_data',
}
