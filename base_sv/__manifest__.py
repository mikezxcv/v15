# -*- coding: utf-8 -*-
{
    'name': "Localizacion Base de El Salvador",
    'summary': """Localizacion Base de El Salvador""",
    'description': """
    Localizacion de El Salvador :
        - Documento de Identificacion Unico
        """,
    'author': "Intelitecsa(Francisco Trejo)",
    'website': "http://www.intelitecsa.com",
    "images": ['static/description/banner.png',
               'static/description/icon.png',
               'static/description/thumbnail.png'],
    'price': 30.00,
    'currency': 'EUR',
    "images": ['static/description/banner.png',
               'static/description/icon.png',
               'static/description/thumbnail.png'],
    'license': 'GPL-3',
    'category': 'Localization',
    'version': '1.1',
    'depends': ['base'],
    'data': [
        'data/res_lang.xml',
        'views/view_res_partner.xml',
        'views/view_res_company.xml',
    ],
    'demo': [
        'demo/res_company_demo.xml',
    ],
    'installable': True,
    'application': False,
    'auto_install': True,
    'post_init_hook': 'install_base_sv',

}
