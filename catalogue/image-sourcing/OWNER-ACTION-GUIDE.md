# Product image permission: owner action guide

Prepared for Ekoway Hardware on 10 August 2026.

## What is already done

- The full 7,771-item image manifest and balanced 300-item priority queue are generated.
- 49 priority products have been checked against official manufacturer sources.
- 30 are exact A-level model matches, 18 require a colour, package, or label check, and one conflicting item is rejected.
- The admin importer performs a dry run first and refuses unapproved, low-confidence, external, or unsafe image paths.
- Approval details and final asset paths now survive future catalogue regeneration.

## Your part: send permission requests

Send from `ekowayhardware@gmail.com`. Start with Khind, Sorento, Joven, Rubine, and Saniware because they cover 44 of the 49 researched products. Then send Nippon Paint, Bosch, and Deka.

Use the contact details in `supplier-permission-contacts.csv`. Send one separate message per brand; do not put all brands in one email.

Subject: Request to use official [BRAND] product images on Ekoway Hardware online store

Message:

> Hello [BRAND] team,
>
> Ekoway Hardware is a Malaysian hardware retailer preparing its online product catalogue. We currently stock genuine [BRAND] products through our local supply chain.
>
> We request written permission to display your official product images on the Ekoway Hardware website for identifying and selling the matching products we stock. Please confirm whether we may download and host the supplied images on our own website, resize or crop them for consistent product cards, and use them without changing the product's appearance, branding, or claims.
>
> If you have an official reseller/dealer media pack, please send its download link and usage terms. Please also tell us whether attribution is required and whether permission covers future [BRAND] products that we stock, or only the attached model list.
>
> We will not provide your images to third parties and will remove or update an asset if you request it.
>
> Business email: ekowayhardware@gmail.com
>
> Thank you,
> Ekoway Hardware

Attach or paste only that brand's item codes and display names from `official-source-pilot.csv`. Do not attach cost data; none exists in this file.

## What counts as approval

Accept one of these:

1. A reply from the manufacturer's official email domain that clearly permits use on Ekoway Hardware's commercial online store.
2. A supplier media pack plus written confirmation that Ekoway may use it for online retail listings.
3. Published dealer-portal terms that explicitly permit commercial reseller use.

Do not treat silence, a public product page, a search result, or a marketplace listing as permission.

Save each approval reply as PDF or `.eml` in a private business records folder. Record the filename or email date in the `permission_reference` column of `supplier-permission-contacts.csv`.

## After a brand approves

For each approved exact item in `official-source-pilot.csv`:

1. Set `rights_status` to `manufacturer-approved` or `supplier-approved`.
2. Leave an exact model at confidence `A`. Upgrade a `C` row to `B` only after comparing the physical carton or product label and confirming finish, capacity, voltage, and included accessories.
3. Put the final compressed image in `frontend/public/product-images/[brand]/` using a simple lowercase `.webp`, `.jpg`, or `.png` filename.
4. Set `image_url` to `/product-images/[brand]/[filename]`.
5. Set `local_asset_path` to the matching repository path.
6. Set `review_status` to `approved`.
7. Keep the approval date or reference in `notes` and the source asset link in `candidate_image_url`.

Then regenerate the manifest and use **Check image manifest** in the admin catalogue. Review the dry-run result and only then select **Apply verified images**. The system will ignore every row that is not fully approved.

## Physical checks needed for C rows

Photograph the front product/carton label clearly enough to read the model, colour/finish, size/capacity, power rating, and package suffix such as `RS`. A phone photo is enough; it is verification evidence and does not need to be attractive.

The rejected Khind `KHI-COO-RC3636` row must remain rejected until the actual label resolves the RC360/RC365/RC3636 conflict.

## Efficient repeat process

You do not need to repeat the setup. For later batches:

1. Add researched official matches to `official-source-pilot.csv`.
2. Keep permissions in `supplier-permission-contacts.csv` and your private approval folder.
3. Regenerate the manifest; reviewed fields and asset paths are retained automatically.
4. Dry-run in admin, then apply only the ready rows.

This creates a reusable audit trail and prevents accidental marketplace hotlinking or image-rights mistakes.
